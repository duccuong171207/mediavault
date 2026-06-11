import Link from 'next/link';

export function Footer() {
  const cols = [
    ['Product', ['Explore', 'Upload Studio', 'Albums', 'Pricing']],
    ['Company', ['About', 'Blog', 'Careers', 'Contact']],
    ['Legal', ['Terms', 'Privacy', 'License', 'Cookies']],
  ] as const;
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 mt-10">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-8 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-bold text-lg mb-3">Media<span className="text-brand">Vault</span></div>
          <p className="text-slate-500 dark:text-slate-400">Professional media sharing for creators. Photos, video, streaming, done right.</p>
        </div>
        {cols.map(([title, items]) => (
          <div key={title}>
            <h4 className="font-semibold mb-3">{title}</h4>
            <ul className="space-y-2 text-slate-500 dark:text-slate-400">
              {items.map((i) => <li key={i}><Link href="#">{i}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="text-center text-xs text-slate-400 pb-8">© 2026 MediaVault. All rights reserved.</div>
    </footer>
  );
}
