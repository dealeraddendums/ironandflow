'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Athlete } from '@/lib/athletes';

export default function BottomNav({ athlete }: { athlete: Athlete }) {
  const pathname = usePathname() || '';
  const base = `/${athlete.id}`;
  const items = [
    { href: base, label: 'Log' },
    { href: `${base}/history`, label: 'History' },
    { href: `${base}/prs`, label: 'PRs' },
    { href: `${base}/settings`, label: 'Settings' },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((i) => (
        <Link key={i.href} href={i.href} data-active={pathname === i.href}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
