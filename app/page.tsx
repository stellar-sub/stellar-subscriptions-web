import Link from "next/link";
import { PlatformStats } from "@/components/home/PlatformStats";

const STEPS = [
  {
    title: "Pick a plan and set your cap",
    body: "You see the amount, how often it's charged, and the most that can ever be taken in total — before you sign anything.",
  },
  {
    title: "The merchant charges on schedule",
    body: "At most one charge per billing interval, always the same amount, pulled straight from your account to theirs.",
  },
  {
    title: "Pause or cancel whenever you like",
    body: "One click, signed by you. After you cancel, no further charge can ever go through.",
  },
];

const GUARANTEES = [
  {
    name: "Never more than your cap",
    body: "The contract adds up every charge and refuses any that would take the total past the cap you chose.",
  },
  {
    name: "Never more often than agreed",
    body: "A second charge in the same interval is refused — even from the right merchant, even if they were late last time.",
  },
  {
    name: "Cancel means stop, for good",
    body: "Only you can cancel, and nothing can undo it. The merchant, the app and the contract admin all have no way to charge you afterwards.",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-20">
      <section className="space-y-6 pt-6 text-center sm:pt-12">
        <p className="eyebrow">Subscriptions native to Stellar</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          Recurring payments on Stellar, on your terms
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted">
          Authorize a spending cap once. Cancel anytime. A merchant can never charge more than you approved,
          or more often than you agreed — the smart contract won&apos;t let them.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/plans" className="btn-primary w-full px-6 py-3 text-base sm:w-auto">
            I&apos;m subscribing
          </Link>
          <Link href="/merchant" className="btn-secondary w-full px-6 py-3 text-base sm:w-auto">
            I&apos;m a merchant
          </Link>
        </div>
      </section>

      <section aria-labelledby="stats-heading" className="space-y-4">
        <h2 id="stats-heading" className="text-lg font-semibold text-fg">
          On the network now
        </h2>
        <PlatformStats />
      </section>

      <section aria-labelledby="how-heading" className="space-y-6">
        <h2 id="how-heading" className="text-2xl font-semibold text-fg">
          How it works
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card space-y-2 p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
                {i + 1}
              </span>
              <h3 className="font-semibold text-fg">{step.title}</h3>
              <p className="text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guarantees-heading" className="space-y-6">
        <div className="space-y-2">
          <h2 id="guarantees-heading" className="text-2xl font-semibold text-fg">
            What the contract guarantees
          </h2>
          <p className="max-w-2xl text-sm text-muted">
            These rules live in the subscription contract on Stellar, not in this website. Each one is proven by
            tests that were written before the contract itself.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {GUARANTEES.map((g) => (
            <div key={g.name} className="card space-y-2 border-brand/20 p-5">
              <h3 className="font-semibold text-fg">{g.name}</h3>
              <p className="text-sm text-muted">{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-4 p-6">
          <h2 className="text-xl font-semibold text-fg">For subscribers</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted">
            <li>See exactly what you&apos;re authorizing before you sign</li>
            <li>Watch how much of your cap has been used</li>
            <li>Pause, resume or cancel from one page</li>
          </ul>
          <Link href="/plans" className="btn-primary">
            Browse plans
          </Link>
        </div>
        <div className="card space-y-4 p-6">
          <h2 className="text-xl font-semibold text-fg">For merchants</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted">
            <li>Publish plans in any Stellar token</li>
            <li>Charge each subscription when it falls due, or all due ones at once</li>
            <li>Track revenue from on-chain charge events</li>
          </ul>
          <Link href="/merchant" className="btn-secondary">
            Open the merchant dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
