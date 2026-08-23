import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  ['folder_copy', 'Everything in one place', 'Upload, organize, tag and find every document without losing your flow.', 'bg-primary-fixed text-primary'],
  ['auto_awesome', 'Ask your documents', 'Turn long files into direct answers with a workspace-aware AI assistant.', 'bg-[#ffe0bd] text-[#75431f]'],
  ['group', 'Share with confidence', 'Keep private work private and share the right files with the right people.', 'bg-[#e8e5f4] text-[#5b527c]'],
];

const documents = [
  ['description', 'Product research.pdf', 'Updated 8 min ago', 'text-[#d47a3c]'],
  ['article', 'Design system.docx', 'Updated yesterday', 'text-[#6f8f72]'],
  ['table_chart', 'Q3 planning.xlsx', 'Shared with 4 people', 'text-[#7891a8]'],
];

export const LandingPage: React.FC = () => {
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f5] text-[#252824]">
      <nav className="relative z-20 mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Docentra home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#27362c] text-white shadow-sm"><span className="material-symbols-outlined icon-fill text-[20px]">cloud_sync</span></span>
          <span className="text-xl font-bold tracking-[-0.045em]">Docentra<span className="text-[#d47a3c]">.</span></span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {!isLoggedIn && <Link to="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#4f574f] transition hover:bg-white">Log in</Link>}
          <Link to={isLoggedIn ? '/dashboard' : '/register'} className="rounded-xl bg-[#27362c] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(39,54,44,.16)] transition hover:-translate-y-0.5 hover:bg-[#33483a]">
            {isLoggedIn ? 'Open workspace' : 'Get started'}
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-24 pt-14 md:px-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-16 lg:pb-32 lg:pt-20">
        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9e5ce] bg-[#eef7e5] px-3 py-1.5 text-xs font-semibold text-[#45604a]"><span className="material-symbols-outlined text-[16px]">auto_awesome</span>A calmer way to work with documents</div>
          <h1 className="text-[44px] font-bold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-[68px]">Your documents,<span className="block text-[#6f8f72]">finally in sync.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#687067] sm:text-lg">One focused workspace to organize knowledge, collaborate with your team and get useful answers from every file.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={isLoggedIn ? '/dashboard' : '/register'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#27362c] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(39,54,44,.18)] transition hover:-translate-y-0.5">
              {isLoggedIn ? 'Go to dashboard' : 'Create free workspace'}<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
            <a href="#features" className="inline-flex items-center justify-center rounded-xl border border-[#dfe5db] bg-white px-6 py-3.5 text-sm font-semibold transition hover:border-[#b9c8b5]">Explore features</a>
          </div>
          <div className="mt-7 flex items-center gap-4 text-xs text-[#7b827a]"><span className="inline-flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-[#6f8f72]">check_circle</span>Free to start</span><span className="inline-flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-[#6f8f72]">check_circle</span>No card required</span></div>
        </div>

        <div className="relative lg:translate-x-4">
          <div className="absolute -left-12 -top-12 h-52 w-52 rounded-full bg-[#dcefc8]/70 blur-3xl" /><div className="absolute -bottom-12 -right-10 h-48 w-48 rounded-full bg-[#ffe0bd]/70 blur-3xl" />
          <div className="relative rounded-[28px] border border-white/80 bg-white/80 p-3 shadow-[0_35px_90px_rgba(35,48,38,.14)] backdrop-blur">
            <div className="overflow-hidden rounded-[21px] border border-[#e5e9e1] bg-[#fafbf8]">
              <div className="flex items-center justify-between border-b border-[#e8ece5] px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8a9189]">Workspace</p><p className="mt-1 font-semibold">Good morning, Samantha <span className="text-[#d47a3c]">●</span></p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#27362c] text-white"><span className="material-symbols-outlined text-[18px]">add</span></span></div>
              <div className="grid gap-3 p-4 sm:grid-cols-[1fr_180px]">
                <div className="rounded-2xl border border-[#e5e9e1] bg-white p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Recent files</span><span className="text-[11px] text-[#7e867d]">View all</span></div><div className="mt-3 space-y-2">
                  {documents.map(([icon, name, meta, color]) => <div key={name} className="flex items-center gap-3 rounded-xl bg-[#f7f8f5] p-3"><span className={`material-symbols-outlined text-[21px] ${color}`}>{icon}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{name}</p><p className="mt-0.5 text-[10px] text-[#8a9189]">{meta}</p></div><span className="material-symbols-outlined ml-auto text-[17px] text-[#9aa099]">more_horiz</span></div>)}
                </div></div>
                <div className="space-y-3"><div className="rounded-2xl bg-[#27362c] p-4 text-white"><span className="material-symbols-outlined text-[#b9d99b]">auto_awesome</span><p className="mt-5 text-sm font-semibold">Ask Docentra AI</p><p className="mt-1 text-[10px] leading-4 text-white/60">Find an answer across all your documents.</p></div><div className="rounded-2xl border border-[#f0d3b6] bg-[#fff1df] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#9a6a43]">Storage</p><p className="mt-2 text-xl font-bold">68%</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full w-[68%] rounded-full bg-[#d47a3c]" /></div></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-[#e5e9e1] bg-white/70 px-5 py-20 md:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#6f8f72]">Made for focus</p><h2 className="mt-3 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Less searching. More useful work.</h2></div><div className="mt-10 grid gap-4 md:grid-cols-3">
        {features.map(([icon, title, description, tone]) => <article key={title} className="rounded-2xl border border-[#e4e9e0] bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(35,48,38,.08)]"><span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}><span className="material-symbols-outlined text-[21px]">{icon}</span></span><h3 className="mt-5 text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#737b72]">{description}</p></article>)}
      </div></div></section>
      <footer className="border-t border-[#e5e9e1] bg-white px-5 py-7 md:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-[#7b827a] sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-[#394139]">Docentra<span className="text-[#d47a3c]">.</span></span><span>© {new Date().getFullYear()} Docentra. Your knowledge, beautifully organized.</span></div></footer>
    </main>
  );
};

export default LandingPage;
