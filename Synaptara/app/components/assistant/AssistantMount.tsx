"use client";

import dynamic from "next/dynamic";

/**
 * Code-split the assistant widget out of the main bundle — it's not needed
 * for first paint on any page, and most sessions never open it.
 */
const AssistantWidget = dynamic(() => import("./AssistantWidget"), {
  ssr: false,
});

export default function AssistantMount() {
  return <AssistantWidget />;
}
