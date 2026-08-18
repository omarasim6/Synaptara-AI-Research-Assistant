import LegalLayout from "@/app/components/LegalLayout";

export const metadata = { title: "Terms of Use — Synaptara" };

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Use"
      lastUpdated="July 1, 2026"
      intro="Please read these Terms of Use carefully. They contain important information regarding your legal rights, remedies, and obligations. If you do not agree to any part of these terms, you may not use or access the Synaptara service."
      sections={[
        {
          heading: "1. Acceptance of Terms",
          body: [
            "By accessing or using Synaptara (the \"Service\"), you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this Service.",
            "We reserve the right to update or change these Terms of Use at any time without prior notice. Your continued use of the Service after any changes constitutes your acceptance of the new Terms of Use.",
          ],
        },
        {
          heading: "2. Use of the Service",
          body: [
            "Synaptara grants you a limited, non-exclusive, non-transferable licence to access and use the Service for your personal or internal business purposes, subject to these Terms.",
            "You agree not to use the Service to: (a) violate any applicable law or regulation; (b) infringe the intellectual property rights of others; (c) transmit any harmful, offensive, or disruptive content; (d) attempt to gain unauthorised access to any portion of the Service or its related systems.",
            "We reserve the right to terminate or suspend your access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, third parties, or for any other reason.",
          ],
        },
        {
          heading: "3. Accounts and Registration",
          body: [
            "To access certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during registration and to keep this information up to date.",
            "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorised use of your account.",
          ],
        },
        {
          heading: "4. Intellectual Property",
          body: "All content included in or made available through the Service — including but not limited to text, graphics, logos, icons, images, software, and data compilations — is the property of Synaptara or its content suppliers and is protected by applicable intellectual property laws. You may not reproduce, duplicate, copy, sell, or exploit any portion of the Service without our express written permission.",
        },
        {
          heading: "5. Disclaimer of Warranties",
          body: "The Service is provided on an \"as is\" and \"as available\" basis without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. Synaptara does not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.",
        },
        {
          heading: "6. Limitation of Liability",
          body: "To the maximum extent permitted by law, Synaptara shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including but not limited to loss of profits, data, goodwill, or other intangible losses — resulting from your use of, or inability to use, the Service.",
        },
        {
          heading: "7. Dispute Resolution",
          body: [
            "If you are located in the United States, you agree that any dispute between you and Synaptara will be resolved through binding individual arbitration rather than in court, except where prohibited by law.",
            "For users outside the United States, disputes shall be governed by and construed in accordance with the laws of the jurisdiction in which Synaptara is incorporated, without regard to conflict of law provisions.",
          ],
        },
        {
          heading: "8. Contact",
          body: "If you have questions about these Terms of Use, please contact us at legal@synaptara.com.",
        },
      ]}
    />
  );
}
