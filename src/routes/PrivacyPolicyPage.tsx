import { Link } from 'react-router-dom';
import {
  Zap,
  ArrowLeft,
  Shield,
  Eye,
  Database,
  CalendarDays,
  Trash2,
  Mail,
  UserCheck,
  Lock,
  Globe2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';

const sections = [
  {
    id: 'introduction',
    title: '1. Introduction',
    icon: Shield,
    content: `Welcome to Finamite. Finamite is a personal management app that helps you organize your tasks, build habits, run focus sessions, keep notes, and sync it all with your Google Calendar — with achievements along the way to keep you motivated.

This policy explains, in plain language, what information we collect, why we collect it, and how you can control it. By using Finamite, you agree to the practices described here. If something here doesn't sit right with you, please don't use the app, or reach out to us with your concerns first — we'd rather explain than lose your trust.`,
  },
  {
    id: 'information-collect',
    title: '2. What We Collect',
    icon: Database,
    content: `To run your account:
- Your name and email address (from sign-up, or from Google if you use "Continue with Google")
- Your password — we never see or store it in readable form, only a securely scrambled version that can't be reversed
- A profile photo if you choose to add one

To run the app itself — this is the content you create as you use Finamite:
- Tasks and projects: titles, descriptions, priorities, due dates, and recurring schedules
- Habits: what you're tracking, your completion history, and your streaks
- Focus sessions: when you started, how long you focused, and what task it was linked to
- Notes and journal entries you write
- Achievements and XP you've earned, and your app preferences

If you connect Google Calendar:
- A secure connection token that lets us talk to your calendar on your behalf (this is encrypted, and you can revoke it at any time)
- The calendar events we create for your tasks and focus sessions, and the minimum information needed to keep them in sync

Automatically, for security and reliability:
- Basic device and browser info, and your IP address, so we can keep the app secure and catch problems
- Which parts of the app you use, so we know what to improve`,
  },
  {
    id: 'how-we-use',
    title: '3. How We Use Your Information',
    icon: Eye,
    content: `We use what we collect to:

- Run your account and keep you signed in securely
- Save and show you your tasks, habits, focus sessions, notes, and achievements
- Keep your Google Calendar in sync when you turn that on
- Remind you about upcoming deadlines and habits, and send account-related emails
- Remember your preferences, like your theme and layout
- Catch and stop suspicious activity, fraud, or abuse
- Meet our legal obligations and enforce our Terms of Service

We do not sell or rent your personal information to anyone, for advertising or anything else. Finamite makes money from the app itself, not from your data.`,
  },
  {
    id: 'google-calendar',
    title: '4. Google Calendar Integration',
    icon: CalendarDays,
    content: `Finamite can sync your tasks and focus sessions with Google Calendar so everything lives in one place.

What this means in practice:
- When you turn on sync, we create and update calendar events for your tasks (on their due dates) and your focus sessions (when they happen).
- We only read calendar events to match them against the tasks you've created in Finamite, so sync stays accurate.
- If you delete a task, disconnect the integration, or close your account, we remove the calendar events we created — within 30 days at the latest.

Required Google disclosure: Finamite's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements. Specifically, we use Google Calendar data solely to provide the sync features described above; we do not use it for advertising, marketing, or profiling; and we do not share it with any other party except as needed to operate the sync itself or as required by law.`,
  },
  {
    id: 'sharing-disclosure',
    title: '5. Who We Share Information With',
    icon: Globe2,
    content: `We keep sharing to a minimum, and only in these situations:

- If you tell us to — for example, connecting Google Calendar.
- With the infrastructure providers who help us run Finamite, like hosting and email delivery. They're only allowed to use your data to provide that service to us, not for their own purposes.
- If we're legally required to — such as responding to a valid court order — or if it's necessary to protect the safety of you, us, or others.
- If Finamite is ever acquired or merges with another company, in which case we'll tell you directly before anything changes.

We never sell or rent your data to advertisers or data brokers.`,
  },
  {
    id: 'data-retention',
    title: '6. How Long We Keep Your Data',
    icon: Trash2,
    content: `We keep your data for as long as your account is open, and delete it shortly after you close it:

- Your profile and all your content (tasks, habits, notes, focus sessions, achievements) are deleted within 30 days of closing your account.
- Your Google Calendar connection is removed immediately if you disconnect it, or when you close your account.
- Calendar events we created are removed at the same time, where possible — occasionally one may be left behind if your calendar wasn't reachable at that moment.
- Security logs are kept for up to 12 months, purely to help us catch and investigate problems.

You can ask us to delete your account and everything tied to it at any time — see "Your Rights" below.`,
  },
  {
    id: 'security',
    title: '7. Keeping Your Data Safe',
    icon: Lock,
    content: `We take reasonable, industry-standard steps to protect your information:

- Your password is never stored in a form anyone could read — including us.
- Your Google connection details are encrypted while stored.
- Everything sent between your device and Finamite is encrypted in transit.
- We review and update our security practices regularly.

No system connected to the internet can be guaranteed 100% secure, but we work hard to keep yours protected.`,
  },
  {
    id: 'your-rights',
    title: '8. Your Rights & Choices',
    icon: UserCheck,
    content: `You're in control of your data:

- See and export it: download your data from Settings, or ask us for a full export.
- Fix it: edit your profile or any content directly in the app, any time.
- Delete it: close your account from Settings to permanently delete your data within 30 days, or email us directly to request deletion.
- Manage emails: unsubscribe from any non-essential email using the link inside it, or turn off notification types in Settings.
- Disconnect Google Calendar: turn it off any time from Settings → Integrations, or revoke access directly at https://myaccount.google.com/permissions.

Questions about any of this? Reach out using the contact details in section 10.`,
  },
  {
    id: 'children',
    title: "9. Children's Privacy",
    icon: UserCheck,
    content: `Finamite isn't intended for children under 13, and we don't knowingly collect information from them. If we learn that someone under 13 has created an account, we'll remove their information and close the account.`,
  },
  {
    id: 'contact',
    title: '10. Contact Us',
    icon: Mail,
    content: `Questions, concerns, or requests about this policy or your data? We're happy to help.

Email: privacy@finamite.com

We aim to reply within 14 business days. If you're not satisfied with our response, you may also have the right to raise a complaint with your local data protection authority.`,
  },
  {
    id: 'changes',
    title: '11. Changes to This Policy',
    icon: Shield,
    content: `If we make meaningful changes to this policy — for example, as we add new features — we'll update the "Last updated" date below and let you know in the app or by email.

Continuing to use Finamite after an update means you're okay with the change.

Last updated: July 25, 2026`,
  },
];

export function PrivacyPolicyPage() {
  return (
    <div
      className="min-h-dvh"
      style={{
        background:
          'radial-gradient(1200px 600px at 0% -10%, var(--color-accent-subtle), transparent 60%), var(--color-bg)',
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
              <Zap size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Finamite · Legal</p>
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">Privacy Policy</h1>
            </div>
          </div>

          <Card variant="glass" className="p-5 sm:p-6 border-accent/10">
            <p className="text-sm text-text-secondary leading-relaxed">
              Effective date: <strong className="text-text-primary">July 25, 2026</strong>. A plain-language look at how
              Finamite collects, uses, and protects your information — including through Google Calendar sync.
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
          <p className="text-xs text-text-muted">ⓒ {new Date().getFullYear()} Finamite. All rights reserved.</p>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs">
            <Link to="/terms" className="text-text-muted hover:text-accent font-medium">
              Terms of Service
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
