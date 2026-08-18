import LegalLayout from "@/app/components/LegalLayout";

export const metadata = { title: "Privacy Policy — Synaptara" };

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="July 1, 2026"
      intro="At Synaptara, your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service."
      sections={[
        {
          heading: "1. Information We Collect",
          body: [
            "Personal Information: When you register for an account, we collect information such as your name, email address, and password. If you sign in via a third-party provider (e.g. Google), we receive basic profile information from that provider.",
            "Usage Data: We automatically collect information about how you interact with the Service — including search queries, pages visited, features used, and time spent. This data is used to improve the quality and relevance of the Service.",
            "Device and Log Information: We collect information about the device you use to access the Service, including IP address, browser type, operating system, and referring URLs.",
          ],
        },
        {
          heading: "2. How We Use Your Information",
          body: [
            "We use the information we collect to: provide, operate, and maintain the Service; personalise your experience and deliver relevant research results; send you transactional emails and product updates (where you have opted in); analyse usage trends to improve our features and performance; comply with legal obligations and enforce our Terms of Use.",
            "We do not sell your personal information to third parties.",
          ],
        },
        {
          heading: "3. Sharing of Information",
          body: [
            "We may share your information with trusted third-party service providers who assist us in operating the Service (e.g. cloud hosting, analytics, email delivery). These providers are contractually obligated to handle your data securely and only for the purposes we specify.",
            "We may disclose your information where required by law, in response to valid legal process, or to protect the rights, property, or safety of Synaptara, our users, or others.",
          ],
        },
        {
          heading: "4. Data Retention",
          body: "We retain your personal information for as long as your account is active or as needed to provide you the Service. You may request deletion of your account and associated data at any time by contacting us at legal@synaptara.com. We will action such requests within 30 days, subject to any legal retention obligations.",
        },
        {
          heading: "5. Security",
          body: "We implement industry-standard technical and organisational measures to protect your personal information from unauthorised access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.",
        },
        {
          heading: "6. Your Rights",
          body: [
            "Depending on your jurisdiction, you may have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data; object to or restrict certain processing; and data portability.",
            "To exercise any of these rights, please contact us at legal@synaptara.com. We will respond to all requests within the timeframe required by applicable law.",
          ],
        },
        {
          heading: "7. Third-Party Links",
          body: "The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of those third parties and encourage you to review their privacy policies before providing any personal information.",
        },
        {
          heading: "8. Changes to This Policy",
          body: "We may update this Privacy Policy from time to time. We will notify registered users of material changes by email and will update the \"last updated\" date at the top of this page. Your continued use of the Service after any changes constitutes your acceptance of the revised policy.",
        },
      ]}
    />
  );
}
