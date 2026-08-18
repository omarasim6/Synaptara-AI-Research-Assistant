"""
Search service.

Two paths:

1. Paper / AI-research queries  → matched against a curated mock corpus below.
   (This is the integration point for a future LlamaIndex / Qdrant pipeline —
   replace the corpus-matching logic with a real vector DB call when ready.)

2. Everything else (general knowledge questions unrelated to papers/AI)
   → answered by the configured AI provider (settings.AI_PROVIDER):
     - "ollama" (default): local model, free, no API key — but no live web
       search, so answers are grounded only in the model's own training
       data, not real-time information. Results are still returned as
       SearchResultItem rows so the UI is unchanged, just without source
       citations (no "Source" cards, since there's nothing to cite).
     - "openai": OpenAI's Responses API with the hosted `web_search` tool
       for real, cited, live-web-grounded answers (requires OPENAI_API_KEY
       + billing).
"""

import logging
import re

import httpx

from app.config import get_settings
from app.schemas.research import SearchResultItem
from app.services.ollama_client import OllamaUnavailableError, ollama_chat

logger = logging.getLogger(__name__)

# ── Mock paper corpus ─────────────────────────────────────────────────────────

_PAPERS: list[dict] = [
    {
        "title": "Attention Is All You Need",
        "authors": "Vaswani et al.",
        "source": "arXiv",
        "year": "2017",
        "tag": "Foundational",
        "summary": (
            "Introduces the Transformer architecture based entirely on attention mechanisms, "
            "dispensing with recurrence and convolutions. Achieves state-of-the-art on machine "
            "translation tasks while being more parallelizable and requiring less training time."
        ),
        "paper_url": "https://arxiv.org/abs/1706.03762",
        "keywords": ["transformer", "attention", "neural network", "nlp", "sequence"],
    },
    {
        "title": "Language Models are Few-Shot Learners",
        "authors": "Brown et al. — OpenAI",
        "source": "OpenAI",
        "year": "2020",
        "tag": "LLMs",
        "summary": (
            "Presents GPT-3, a 175B parameter autoregressive language model demonstrating strong "
            "few-shot performance across a wide range of NLP tasks without fine-tuning."
        ),
        "paper_url": "https://arxiv.org/abs/2005.14165",
        "keywords": ["gpt", "llm", "language model", "few-shot", "in-context learning"],
    },
    {
        "title": "Constitutional AI: Harmlessness from AI Feedback",
        "authors": "Bai et al. — Anthropic",
        "source": "Anthropic",
        "year": "2022",
        "tag": "AI Safety",
        "summary": (
            "Describes a method to train AI systems to be helpful, harmless, and honest using "
            "a set of principles (a 'constitution') and AI-generated feedback rather than human "
            "labels for harmlessness."
        ),
        "paper_url": "https://arxiv.org/abs/2212.08073",
        "keywords": ["ai safety", "rlhf", "alignment", "harmless", "constitutional"],
    },
    {
        "title": "Denoising Diffusion Probabilistic Models",
        "authors": "Ho et al.",
        "source": "arXiv",
        "year": "2020",
        "tag": "Generative AI",
        "summary": (
            "Presents diffusion probabilistic models, a class of latent variable models inspired "
            "by nonequilibrium thermodynamics that match GANs on image quality while enabling "
            "exact log-likelihood computation."
        ),
        "paper_url": "https://arxiv.org/abs/2006.11239",
        "keywords": ["diffusion", "generative", "image", "ddpm", "latent"],
    },
    {
        "title": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
        "authors": "Lewis et al. — Meta AI",
        "source": "arXiv",
        "year": "2020",
        "tag": "RAG",
        "summary": (
            "Introduces RAG — combining parametric memory from pre-trained language models with "
            "non-parametric memory from a differentiable retriever — for knowledge-intensive NLP, "
            "outperforming existing methods on open-domain QA benchmarks."
        ),
        "paper_url": "https://arxiv.org/abs/2005.11401",
        "keywords": ["rag", "retrieval", "knowledge", "qa", "search"],
    },
    {
        "title": "Highly Accurate Protein Structure Prediction with AlphaFold",
        "authors": "Jumper et al. — DeepMind",
        "source": "DeepMind",
        "year": "2021",
        "tag": "Biology",
        "summary": (
            "AlphaFold 2 achieves protein structure prediction accuracy competitive with "
            "experimental methods, solving a 50-year grand challenge in biology using a novel "
            "combination of attention and equivariant networks."
        ),
        "paper_url": "https://www.nature.com/articles/s41586-021-03819-2",
        "keywords": ["protein", "biology", "alphafold", "structure prediction", "deepmind"],
    },
    {
        "title": "Training Language Models to Follow Instructions with Human Feedback",
        "authors": "Ouyang et al. — OpenAI",
        "source": "OpenAI",
        "year": "2022",
        "tag": "RLHF",
        "summary": (
            "InstructGPT uses RLHF (reinforcement learning from human feedback) to fine-tune "
            "GPT-3 to follow instructions better than 100x larger models, demonstrating that "
            "alignment and capability can improve simultaneously."
        ),
        "paper_url": "https://arxiv.org/abs/2203.02155",
        "keywords": ["rlhf", "instruction", "human feedback", "alignment", "fine-tuning"],
    },
    {
        "title": "Gemini: A Family of Highly Capable Multimodal Models",
        "authors": "Google DeepMind Team",
        "source": "DeepMind",
        "year": "2023",
        "tag": "Multimodal",
        "summary": (
            "Gemini is a family of multimodal models natively trained on text, images, audio, "
            "and video, achieving state-of-the-art on 30 of 32 benchmarks and exhibiting "
            "advanced reasoning capabilities."
        ),
        "paper_url": "https://arxiv.org/abs/2312.11805",
        "keywords": ["multimodal", "vision", "audio", "gemini", "google"],
    },
    {
        "title": "BERT: Pre-training of Deep Bidirectional Transformers",
        "authors": "Devlin et al. — Google",
        "source": "arXiv",
        "year": "2018",
        "tag": "Foundational",
        "summary": (
            "BERT introduces deep bidirectional pre-training for NLP using masked language "
            "modeling and next-sentence prediction, achieving new state-of-the-art results "
            "on eleven NLP tasks."
        ),
        "paper_url": "https://arxiv.org/abs/1810.04805",
        "keywords": ["bert", "pre-training", "bidirectional", "nlp", "representation"],
    },
    {
        "title": "Scaling Laws for Neural Language Models",
        "authors": "Kaplan et al. — OpenAI",
        "source": "OpenAI",
        "year": "2020",
        "tag": "LLMs",
        "summary": (
            "Establishes empirical scaling laws for language model performance as a function "
            "of model size, dataset size, and compute budget, providing guidance for efficient "
            "resource allocation in large-scale training."
        ),
        "paper_url": "https://arxiv.org/abs/2001.08361",
        "keywords": ["scaling", "compute", "training", "language model", "laws"],
    },
    {
        "title": "PubMedBERT: Domain-Specific Language Models for Biomedical NLP",
        "authors": "Gu et al.",
        "source": "PubMed",
        "year": "2021",
        "tag": "Biomedical",
        "summary": (
            "PubMedBERT pre-trains from scratch on PubMed abstracts and full-text articles, "
            "outperforming general-domain and mixed-domain models on eight biomedical NLP tasks."
        ),
        "paper_url": "https://arxiv.org/abs/2007.15779",
        "keywords": ["biomedical", "pubmed", "clinical", "nlp", "medical"],
    },
    {
        "title": "Reinforcement Learning from Human Feedback: A Survey",
        "authors": "Casper et al.",
        "source": "arXiv",
        "year": "2023",
        "tag": "RLHF",
        "summary": (
            "Comprehensive survey of RLHF methods, covering preference modeling, reward "
            "learning, policy optimization, and open challenges in aligning language models "
            "with human values and intentions."
        ),
        "paper_url": "https://arxiv.org/abs/2307.15217",
        "keywords": ["rlhf", "reinforcement learning", "alignment", "survey", "human"],
    },
]

# Source → display label mapping for filtering
_VALID_SOURCES = {"arXiv", "OpenAI", "Anthropic", "DeepMind", "PubMed"}

# ── Topic gate ──────────────────────────────────────────────────────────────
# Broader than the paper corpus's own keywords so things like "what is a
# neural network" or "explain gradient descent" still count as on-topic even
# though no single paper matches them well.
_ON_TOPIC_TERMS = {
    "paper", "papers", "research", "arxiv", "preprint", "publication",
    "study", "studies", "journal", "citation", "cite",
    "ai", "a.i.", "artificial intelligence", "machine learning", "ml",
    "deep learning", "neural network", "neural net", "transformer",
    "attention", "llm", "large language model", "gpt", "language model",
    "nlp", "natural language processing", "computer vision", "cv",
    "reinforcement learning", "rlhf", "diffusion", "generative", "gan",
    "alignment", "safety", "rag", "retrieval", "embedding", "fine-tun",
    "pretrain", "pre-train", "gradient", "backprop", "supervised",
    "unsupervised", "dataset", "benchmark", "algorithm", "model architecture",
    "bert", "gemini", "claude", "anthropic", "openai", "deepmind",
    "alphafold", "protein", "multimodal", "token", "parameter",
}

_ON_TOPIC_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in _ON_TOPIC_TERMS) + r")\b",
    re.IGNORECASE,
)


# Common English stopwords — excluded from the loose word-overlap scoring
# below so that trivial words like "is", "the", "of", "a", "what" (which
# appear in almost every paper title/summary, e.g. "Attention Is All You
# Need") don't cause completely unrelated queries (e.g. "what is the capital
# of France") to score as paper-related and get misrouted away from the
# general RAG/web-search path.
_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "of", "in", "on", "at", "to", "for", "with", "by", "from", "as",
    "and", "or", "but", "if", "so", "than", "then",
    "what", "when", "where", "who", "whom", "which", "why", "how",
    "this", "that", "these", "those", "it", "its", "i", "you", "he",
    "she", "we", "they", "do", "does", "did", "can", "could", "will",
    "would", "should", "may", "might", "must", "have", "has", "had",
    "not", "no", "yes", "me", "my", "your", "our", "their",
}


def _is_paper_or_ai_related(query: str) -> bool:
    """Heuristic gate: does this query belong to the paper-search domain?"""
    q = query.lower()
    if _ON_TOPIC_PATTERN.search(q):
        return True
    # Also count it on-topic if it clearly matches the mock corpus itself.
    return any(_score(p, q) >= 3 for p in _PAPERS)


def _content_words(text: str) -> set[str]:
    """Words worth matching on — excludes stopwords and very short tokens
    that would otherwise match almost any paper title/summary by chance."""
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 2 and w not in _STOPWORDS}


def _score(paper: dict, query_lower: str) -> int:
    """Simple keyword relevance score — higher is better."""
    score = 0
    for kw in paper["keywords"]:
        if kw in query_lower:
            score += 3
    if query_lower in paper["title"].lower():
        score += 5
    if query_lower in paper["summary"].lower():
        score += 2

    query_words = _content_words(query_lower)
    title_words = _content_words(paper["title"])
    summary_words = _content_words(paper["summary"])
    if query_words & title_words:
        score += 2
    if query_words & summary_words:
        score += 1
    return score


def _search_papers(query: str, source_filter: str | None) -> tuple[list[SearchResultItem], bool]:
    """
    Existing mock-corpus keyword search. Returns (results, had_real_match).

    had_real_match is False when nothing in the ~15-paper demo corpus
    actually scored above 0 — in that case the "results" returned are just
    filler (the first few papers regardless of relevance) so the UI never
    shows a totally empty list. run_search() uses had_real_match to decide
    whether to fall through to the real (OpenAI-grounded) RAG path instead
    of showing those irrelevant filler papers, which is what most on-topic
    AI questions would otherwise silently hit — this tiny hardcoded corpus
    is a placeholder for a future LlamaIndex/Qdrant pipeline, not a real
    paper database, so it only actually has ~15 famous papers in it.
    """
    q = query.lower().strip()

    scored = [(p, _score(p, q)) for p in _PAPERS]
    scored.sort(key=lambda x: x[1], reverse=True)

    if source_filter and source_filter in _VALID_SOURCES:
        scored = [(p, s) for p, s in scored if p["source"] == source_filter]

    # A meaningful match needs a real keyword/title hit (>= 3), not just one
    # incidental shared word from the loose content-word overlap scoring —
    # e.g. "AlphaFold 3 protein structure prediction benchmark results"
    # sharing only the word "benchmark" with an unrelated paper's summary
    # (score 1) shouldn't count as a genuine match and suppress real RAG.
    results = [p for p, s in scored if s >= 3]
    had_real_match = bool(results)
    if not results:
        results = [p for p, _ in scored[:5]]

    items = [
        SearchResultItem(
            title=p["title"],
            authors=p["authors"],
            source=p["source"],
            year=p["year"],
            tag=p["tag"],
            summary=p["summary"],
            paper_url=p.get("paper_url"),
        )
        for p in results
    ]
    return items, had_real_match


async def _call_openai_responses(
    client: httpx.AsyncClient, settings, query: str, *, tool_type: str | None
) -> httpx.Response:
    payload: dict = {
        "model": settings.OPENAI_MODEL,
        "input": (
            "Answer the user's question clearly and concisely" +
            (" using current web information." if tool_type else ".") +
            " Question: " + query
        ),
    }
    if tool_type:
        payload["tools"] = [{"type": tool_type}]
    return await client.post(
        "https://api.openai.com/v1/responses",
        headers={
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
    )


async def _general_rag_answer(query: str) -> list[SearchResultItem]:
    """Dispatches to the configured AI provider for the general-knowledge
    fallback (queries that aren't about research papers / AI)."""
    settings = get_settings()
    if settings.AI_PROVIDER == "openai":
        return await _general_rag_answer_openai(query)
    return await _general_rag_answer_ollama(query)


async def _general_rag_answer_ollama(query: str) -> list[SearchResultItem]:
    """
    Local-model answer via Ollama — no live web search, so the result is
    grounded only in the model's own training data. Honest about that
    limitation in the returned tag/title so it's never confused with a
    real, sourced RAG result.
    """
    try:
        reply = await ollama_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "Answer the user's question clearly and concisely, in a "
                        "few sentences. You do not have access to live internet "
                        "data — if the question depends on current events or "
                        "real-time information you don't know, say so plainly "
                        "instead of guessing."
                    ),
                },
                {"role": "user", "content": query},
            ]
        )
    except OllamaUnavailableError as exc:
        reason = str(exc)
        if reason == "connection_failed":
            title = "Can't reach the local AI model"
            summary = (
                "Ollama isn't running or isn't reachable from the backend. "
                "Make sure Ollama is running on your machine, then try again."
            )
        elif reason == "model_not_found":
            title = "Local model not downloaded yet"
            summary = (
                "The configured OLLAMA_MODEL hasn't been pulled yet. Run "
                "`ollama pull llama3.2:1b` (or your configured model name) "
                "and try again."
            )
        elif reason == "timeout":
            title = "Local model took too long to respond"
            summary = "Try again in a moment — this can happen on slower hardware or the first request after startup."
        else:
            title = "Couldn't fetch an answer"
            summary = "Something went wrong reaching the local AI model. Check the backend logs for details."
        return [
            SearchResultItem(
                title=title, authors="Synaptara", source="System", year="2026",
                tag="Error", summary=summary, paper_url=None,
            )
        ]

    return [
        SearchResultItem(
            title=f"Answer (not web-verified): {query.strip()[:80]}",
            authors="Synaptara AI (local)",
            source="Web",
            year="2026",
            tag="Unverified",
            summary=reply,
            paper_url=None,
        )
    ]


async def _general_rag_answer_openai(query: str) -> list[SearchResultItem]:
    """
    Real RAG for anything outside the paper/AI domain, via OpenAI:
      1. Retrieve — OpenAI's hosted web-search tool pulls current web results.
      2. Generate — the model composes an answer grounded in those results.
      3. Return the answer + each retrieved source as SearchResultItem rows so
         the existing result-card UI can render them with zero frontend changes.

    OpenAI has renamed the hosted web-search tool between API versions
    ("web_search_preview" → "web_search"), so this tries both tool names
    before falling back to a plain (non-grounded) answer rather than failing
    outright — a stale tool name shouldn't take down general Q&A entirely.
    """
    settings = get_settings()
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-your-openai-api-key":
        logger.warning("OPENAI_API_KEY not set — cannot run general RAG fallback.")
        return [
            SearchResultItem(
                title="General answers aren't configured yet",
                authors="Synaptara",
                source="System",
                year="2026",
                tag="Setup required",
                summary=(
                    "This question isn't about research papers or AI, so it would "
                    "normally be answered by the general-knowledge assistant — but "
                    "no OPENAI_API_KEY is configured on the backend yet. Add a real "
                    "key to synaptara-backend/.env and restart the server."
                ),
                paper_url=None,
            )
        ]

    data: dict | None = None
    used_web_search = False
    last_error_detail = ""
    last_status_code: int | None = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        for tool_type in ("web_search", "web_search_preview"):
            try:
                resp = await _call_openai_responses(client, settings, query, tool_type=tool_type)
                if resp.status_code == 200:
                    data = resp.json()
                    used_web_search = True
                    break
                last_status_code = resp.status_code
                last_error_detail = resp.text[:500]
                logger.warning("OpenAI RAG tool '%s' failed (%s): %s", tool_type, resp.status_code, last_error_detail)
            except httpx.HTTPError:
                logger.exception("OpenAI RAG request errored for tool '%s'", tool_type)

        if data is None:
            # Both web-search tool names failed (wrong model, deprecated tool,
            # etc.) — fall back to a plain answer with no live grounding
            # rather than showing the user a hard failure.
            try:
                resp = await _call_openai_responses(client, settings, query, tool_type=None)
                last_status_code = resp.status_code
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPError:
                last_error_detail = getattr(resp, "text", last_error_detail)[:500] if "resp" in dir() else last_error_detail
                logger.exception("OpenAI RAG fallback (no tools) also failed. Last tool error: %s", last_error_detail)

                # 429 covers two very different OpenAI failure modes — a
                # transient rate limit (retry shortly) or `insufficient_quota`
                # (no credits/billing not set up on this project, which won't
                # resolve itself on retry). Surface which one it actually was
                # instead of a generic "something went wrong", since the fix
                # is different for each and this is otherwise invisible
                # without reading backend logs.
                if last_status_code == 429:
                    is_quota_issue = "insufficient_quota" in last_error_detail
                    if is_quota_issue:
                        title = "Answers are paused — OpenAI quota exceeded"
                        summary = (
                            "The configured OPENAI_API_KEY's project has no available "
                            "quota/credits (OpenAI returned 'insufficient_quota'). Add "
                            "credits or check billing at platform.openai.com/settings, "
                            "then try again — this won't resolve on its own."
                        )
                    else:
                        title = "Answers are temporarily rate-limited"
                        summary = (
                            "OpenAI is rate-limiting this API key right now (429 "
                            "rate_limit_exceeded). This is usually transient — wait a "
                            "moment and try again."
                        )
                elif last_status_code == 401:
                    title = "OpenAI API key rejected"
                    summary = (
                        "OpenAI returned 401 Unauthorized for the configured "
                        "OPENAI_API_KEY — it's missing, revoked, or invalid. Check "
                        "OPENAI_API_KEY in the backend .env."
                    )
                else:
                    title = "Couldn't fetch an answer"
                    summary = (
                        "Something went wrong reaching the general-knowledge assistant "
                        f"(OpenAI returned status {last_status_code}). Check "
                        "OPENAI_API_KEY and OPENAI_MODEL in the backend .env, and check "
                        "the backend logs for the exact OpenAI error."
                    )

                return [
                    SearchResultItem(
                        title=title,
                        authors="Synaptara",
                        source="System",
                        year="2026",
                        tag="Error",
                        summary=summary,
                        paper_url=None,
                    )
                ]

    answer_text = _extract_output_text(data)
    sources = _extract_web_sources(data)

    # Be honest with the user when we couldn't ground the answer in live web
    # results (both web-search tool variants failed) — an ungrounded LLM
    # answer with no sources looks identical to a real RAG result otherwise,
    # which would be misleading in a product whose whole pitch is "every
    # answer is sourced."
    title = f"Answer: {query.strip()[:80]}"
    if not used_web_search:
        title = f"Answer (not web-verified): {query.strip()[:80]}"

    items: list[SearchResultItem] = [
        SearchResultItem(
            title=title,
            authors="Synaptara AI",
            source="Web",
            year="2026",
            tag="General" if used_web_search else "Unverified",
            summary=answer_text or "No answer was returned.",
            paper_url=sources[0]["url"] if sources else None,
        )
    ]

    for s in sources[:6]:
        items.append(
            SearchResultItem(
                title=s.get("title") or s.get("url", "Source"),
                authors=s.get("url", ""),
                source="Web",
                year="2026",
                tag="Source",
                summary=s.get("snippet", ""),
                paper_url=s.get("url"),
            )
        )

    return items


def _extract_output_text(data: dict) -> str:
    """Pull the assistant's final text out of an OpenAI Responses API payload."""
    if "output_text" in data and data["output_text"]:
        return data["output_text"]
    chunks: list[str] = []
    for item in data.get("output", []):
        if item.get("type") == "message":
            for part in item.get("content", []):
                if part.get("type") in ("output_text", "text"):
                    chunks.append(part.get("text", ""))
    return "\n".join(chunks).strip()


def _extract_web_sources(data: dict) -> list[dict]:
    """Pull cited web results out of an OpenAI Responses API payload."""
    sources: list[dict] = []
    for item in data.get("output", []):
        if item.get("type") == "message":
            for part in item.get("content", []):
                for ann in part.get("annotations", []) or []:
                    if ann.get("type") == "url_citation":
                        sources.append(
                            {
                                "url": ann.get("url"),
                                "title": ann.get("title"),
                                "snippet": "",
                            }
                        )
    return sources


async def run_search(
    query: str, source_filter: str | None = None
) -> list[SearchResultItem]:
    """
    Returns ranked search results for the given query.

    Paper/AI-domain queries first try the curated mock corpus below (swap
    for a LlamaIndex / Qdrant pipeline when the backend AI layer is ready).
    That corpus only has ~15 famous papers in it, so most real AI-research
    questions won't genuinely match anything in it — rather than showing
    those unrelated filler papers as if they were the answer, such queries
    fall through to the same live web-search RAG pipeline used for general
    knowledge questions, so every query gets a real, grounded answer.
    """
    if _is_paper_or_ai_related(query):
        results, had_real_match = _search_papers(query, source_filter)
        if had_real_match:
            return results
    return await _general_rag_answer(query)


def build_report_markdown(query: str, results: list[SearchResultItem]) -> str:
    """
    Compiles search results into a literature-review-style Markdown report.

    This is the integration point for a future LLM-authored summary/synthesis
    pass — for now it deterministically formats the same results shown on
    the search page into a structured report so a generated report is always
    grounded in exactly what the user searched.
    """
    lines: list[str] = []
    lines.append(f"# {query.strip()}")
    lines.append("")
    lines.append(
        f"*Automated literature review compiled from {len(results)} "
        f"source{'s' if len(results) != 1 else ''}.*"
    )
    lines.append("")
    lines.append("## Overview")
    lines.append("")
    if results:
        top = results[0]
        lines.append(top.summary)
    else:
        lines.append("No sources were found for this query.")
    lines.append("")
    lines.append("## Sources")
    lines.append("")
    for i, r in enumerate(results, start=1):
        lines.append(f"### {i}. {r.title}")
        lines.append(f"*{r.authors} — {r.source}, {r.year}*")
        lines.append("")
        lines.append(r.summary)
        if r.paper_url:
            lines.append("")
            lines.append(f"[Read source]({r.paper_url})")
        lines.append("")
    return "\n".join(lines)
