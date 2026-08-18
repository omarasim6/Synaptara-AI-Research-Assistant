import LegalLayout from "@/app/components/LegalLayout";

export const metadata = { title: "Cookie Policy — Synaptara" };

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      lastUpdated="July 1, 2026"
      intro="This Cookie Policy explains what cookies are, how Synaptara uses them, and your choices regarding their use. By continuing to use our Service, you consent to our use of cookies as described in this policy."
      sections={[
        {
          heading: "1. What Are Cookies?",
          body: "Cookies are small text files placed on your device by a website when you visit it. They are widely used to make websites work efficiently, provide a better user experience, and give website owners information about how their site is being used. Cookies are not programs — they cannot run code or deliver viruses.",
        },
        {
          heading: "2. Types of Cookies We Use",
          body: [
            "Strictly Necessary Cookies: These are essential for the Service to function. They enable core features such as authentication (keeping you signed in), security, and session management. You cannot opt out of these cookies as the Service cannot function without them.",
            "Performance & Analytics Cookies: We use these to understand how visitors interact with the Service — for example, which pages are most visited and whether users encounter error messages. All information collected is aggregated and anonymous.",
            "Functional Cookies: These cookies remember your preferences and settings (such as language or research topics) to provide a more personalised experience. Disabling them may affect the functionality of the Service.",
            "Third-Party Cookies: We use third-party services such as Google (for OAuth sign-in and analytics) that may set their own cookies. These are governed by the respective providers' cookie policies.",
          ],
        },
        {
          heading: "3. How Long Do Cookies Last?",
          body: [
            "Session Cookies: These expire when you close your browser. They are used primarily for authentication and security during your active session.",
            "Persistent Cookies: These remain on your device for a set period (typically 30–365 days) or until you delete them. They are used to remember your preferences and keep you signed in across sessions.",
          ],
        },
        {
          heading: "4. Managing Your Cookie Preferences",
          body: [
            "You can control and manage cookies in several ways. Most browsers allow you to view, block, or delete cookies through their settings. Note that blocking strictly necessary cookies will prevent you from using certain parts of the Service.",
            "To opt out of analytics cookies specifically, you may use browser-level settings or tools such as the Google Analytics opt-out browser add-on. These preferences are device-specific and will need to be set on each browser and device you use.",
          ],
        },
        {
          heading: "5. Do Not Track",
          body: "Some browsers include a \"Do Not Track\" (DNT) feature that signals to websites you visit that you do not want to be tracked. Our Service currently does not respond to DNT signals, but you can use the cookie controls described above to limit tracking.",
        },
        {
          heading: "6. Changes to This Cookie Policy",
          body: "We may update this Cookie Policy from time to time to reflect changes in technology, law, or our data practices. We will update the \"last updated\" date and, where changes are material, notify you via email or a prominent notice on the Service.",
        },
      ]}
    />
  );
}
