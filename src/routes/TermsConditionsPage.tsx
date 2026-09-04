import { Link } from 'react-router-dom';
import {
  
  ArrowLeft,
  FileCheck,
  User,
  Gavel,
  Ban,
  AlertTriangle,
  Briefcase,
  Heart,
  RefreshCw,
  Mail,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { APP_NAME, COMPANY_NAME, LEGAL_HEADER_LABEL, LEGAL_EMAIL } from '../config/brand';

const sections = [
  {
    id: 'acceptance',
    title: '1. Agreeing to These Terms',
    icon: FileCheck,
    content: `Welcome to ${APP_NAME} — a personal management app for your tasks, habits, focus sessions, notes, and Google Calendar sync. These Terms are the agreement between you and ${APP_NAME} ("we," "our," or "us") for using the app.

By creating an account or using ${APP_NAME}, you're agreeing to these Terms. If you don't agree with them, please don't use the app.

If you connect a third-party service like Google Calendar, you're also agreeing to that provider's own terms.`,
  },
  {
    id: 'eligibility',
    title: '2. Your Account',
    icon: User,
    content: `To use ${APP_NAME}, you need to:

- Give us accurate account information.
- Keep your login details safe, and let us know right away if you think someone else has accessed your account.

You're responsible for what happens under your account, so please don't share your login with anyone. We may suspend or close accounts that break these Terms or use fake information.

If you sign in with Google, you're confirming you're allowed to grant the permissions Google's sign-in screen asks for.`,
  },
  {
    id: 'user-conduct',
    title: `3. Using ${APP_NAME} Responsibly`,
    icon: Gavel,
    content: `Please don't:

- Use ${APP_NAME} for anything illegal.
- Post or store content that's harmful, threatening, harassing, or otherwise offensive.
- Infringe on someone else's rights — copyright, privacy, or otherwise.
- Try to break into the app, other people's accounts, or the systems behind ${APP_NAME}.
- Disrupt the app for other users, or introduce viruses or malicious code.
- Copy, resell, or repackage ${APP_NAME} for your own commercial product without asking us first.
- Reverse-engineer the app to figure out how it works internally.

If we find someone doing this, we'll take it seriously and may act on it, including closing the account involved.`,
  },
  {
    id: 'user-content',
    title: '4. Your Content',
    icon: Briefcase,
    content: `Everything you create in ${APP_NAME} — your tasks, habits, notes, journal entries, and project details — is called "User Content," and it's yours. These Terms don't give us ownership of it.

What we're allowed to do with it: We need permission to store, sync, and display your content in order to run the app for you. So by using ${APP_NAME}, you're giving us the go-ahead to host and process your content solely to:
- Show it to you and keep it working across your devices
- Sync it with integrations you turn on, like Google Calendar
- Back it up so you don't lose it
- Meet any legal obligations we have

What belongs to us: The app itself — its design, code, logo, and features — is ours, and this agreement doesn't give you rights to it beyond using the app as intended.`,
  },
  {
    id: 'integrations',
    title: '5. Connecting Google Calendar',
    icon: RefreshCw,
    content: `${APP_NAME} can connect to Google Calendar to sync your tasks and focus sessions automatically.

When you turn this on:
- You're allowing us to create, update, and remove calendar events on your behalf, exactly as described in our Privacy Policy and the Google consent screen you approved.
- You can review or revoke this access any time from Settings → Integrations, or directly at https://myaccount.google.com/permissions.
- We're not responsible for how Google Calendar itself behaves — if it's down, changes its rules, or anything else outside our control, we'll do our best but can't guarantee the integration keeps working.`,
  },
  {
    id: 'subscription',
    title: '6. Pricing',
    icon: Briefcase,
    content: `${APP_NAME} is currently free to use. If we introduce paid plans or premium features down the line, we'll be upfront about pricing before you're charged anything, and we'll let you know about any future price changes in advance.`,
  },
  {
    id: 'availability',
    title: '7. Keeping the App Running',
    icon: ShieldCheck,
    content: `We aim to keep ${APP_NAME} available and reliable, but we can't promise it'll never go down — occasionally we'll need to pause the app for maintenance or fixes.

We may also add, change, or remove features over time, including integrations, as we improve the product. We'll try to give you a heads-up for anything major.`,
  },
  {
    id: 'disclaimers',
    title: '8. No Guarantees',
    icon: AlertTriangle,
    content: `${APP_NAME} is provided "as is." We work hard to make it reliable and useful, but we can't legally promise it'll be perfect, uninterrupted, or error-free, and we can't guarantee it'll meet every specific need you have.

${APP_NAME} is a productivity tool, not professional advice. If you need financial, legal, medical, or psychological guidance, please talk to a qualified professional — don't rely on the app for that.`,
  },
  {
    id: 'liability',
    title: '9. Limits on Our Liability',
    icon: Scale,
    content: `To the extent allowed by law, ${APP_NAME} isn't liable for indirect or unforeseeable damages — like lost profits or lost data — that might result from using the app.

If something does go wrong and we are found liable, our total responsibility is capped at whatever you've paid us in the past 12 months. This limit doesn't apply where local law says it can't.`,
  },
  {
    id: 'indemnification',
    title: '10. If Something Goes Wrong Because of Your Use',
    icon: Heart,
    content: `If your use of ${APP_NAME} — or content you post — causes a claim against us (for example, because it infringed someone else's rights or broke these Terms), you agree to cover the reasonable costs that result, including legal fees, and to work with us to resolve it.`,
  },
  {
    id: 'termination',
    title: '11. Closing Your Account',
    icon: Ban,
    content: `You can close your account any time from Settings. We may also suspend or close an account that seriously breaks these Terms or puts other users at risk.

When an account closes:
- Access to ${APP_NAME} stops right away.
- Your content is deleted within 30 days, unless we're legally required to keep something longer.
- If you'd like a copy of your data first, you can export it before closing your account.`,
  },
  {
    id: 'general',
    title: '12. The Fine Print',
    icon: Scale,
    content: `Governing law: These Terms are governed by the laws of the jurisdiction where ${APP_NAME} is registered, and any dispute would be handled in that jurisdiction's courts.

Updates: We may update these Terms as ${APP_NAME} evolves. We'll post the change here with a new "Last updated" date, and let you know in the app or by email for anything significant. Continuing to use ${APP_NAME} after an update means you accept it.

If one part of these Terms turns out to be unenforceable, the rest still stands. Not enforcing a term once doesn't mean we're waiving it for later. We may transfer our rights under these Terms if ${APP_NAME} changes ownership; you may not transfer yours without asking us first. Together with our Privacy Policy, these Terms are the whole agreement between you and us about using ${APP_NAME}.`,
  },
  {
    id: 'contact',
    title: '13. Get in Touch',
    icon: Mail,
    content: `Questions about these Terms? We're glad to help.

Email: ${LEGAL_EMAIL}

We aim to respond within 14 business days.

Last updated: July 25, 2026`,
  },
];

export function TermsConditionsPage() {
  return (
    <div
      className="min-h-dvh"
      style={{
        background:
          'radial-gradient(1200px 600px at 100% -10%, var(--color-accent-subtle), transparent 60%), var(--color-bg)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-primary mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>

          <div className="flex items-center gap-4 mb-6 select-none">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/15"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <img src="/logo.svg" alt="Terms of Service" className="w-full h-full object-cover rounded-2xl" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-muted">{LEGAL_HEADER_LABEL}</p>
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">Terms of Service</h1>
            </div>
          </div>

          <Card variant="glass" className="p-5 sm:p-6 border-accent/10">
            <p className="text-sm text-text-secondary leading-relaxed">
              Effective date: <strong className="text-text-primary">July 25, 2026</strong>. A plain-language guide to
              using {APP_NAME}, alongside our{' '}
              <Link to="/privacy" className="text-accent hover:underline font-semibold">
                Privacy Policy
              </Link>
              .
            </p>
          </Card>
        </div>

        {/* Quick nav (desktop) */}
        <Card variant="glass" className="p-4 sm:p-5 mb-8 hidden md:block animate-slide-in">
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-3">Contents</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-text-muted hover:text-accent transition-colors truncate block font-medium"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((s, idx) => {
            const Icon = s.icon;
            return (
              <Card
                key={s.id}
                variant="glass"
                className="p-6 sm:p-8 animate-slide-in stagger"
                id={s.id}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--color-accent-subtle)' }}
                  >
                    <Icon size={18} className="text-accent" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight pt-1.5">{s.title}</h2>
                </div>
                <div className="pl-0 sm:pl-14">
                  {s.content.split('\n\n').map((para, pIdx) => (
                    <p
                      key={pIdx}
                      className="text-sm text-text-secondary leading-relaxed mb-3 last:mb-0 whitespace-pre-line"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-xs text-text-muted">ⓒ {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</p>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs">
            <Link to="/privacy" className="text-text-muted hover:text-accent font-medium">
              Privacy Policy
            </Link>
            <span className="text-border">|</span>
            <Link to="/login" className="text-text-muted hover:text-accent font-medium">
              Sign in
            </Link>
            <span className="text-border">|</span>
            <Link to="/signup" className="text-text-muted hover:text-accent font-medium">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
