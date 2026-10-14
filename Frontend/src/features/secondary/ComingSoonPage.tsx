import { FlaskConical } from 'lucide-react'

export function ComingSoonPage({ feature }: { feature: string }) {
  return <div className="page-stack"><section className="panel empty-state"><FlaskConical size={34} /><p className="eyebrow">Phase 2</p><h1>{feature} is not enabled yet.</h1><p>We kept the product idea, but the old prototype called APIs that did not exist. This route will open only after its authorized backend contract, persistence, tests, and safety checks ship together.</p></section></div>
}
