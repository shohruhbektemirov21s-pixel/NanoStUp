import React from 'react';

export const Contact = ({ content }: { content: any }) => {
  return (
    <section className="py-24 bg-zinc-50">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20">
        <div>
          <h2 className="text-4xl font-black mb-6">{content.title}</h2>
          <p className="text-zinc-500 mb-10">{content.description}</p>
          <div className="space-y-6">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-zinc-100 shadow-sm">📍</div>
                <div className="font-bold">{content.address}</div>
             </div>
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-zinc-100 shadow-sm">📧</div>
                <div className="font-bold">{content.email}</div>
             </div>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm">
          <form className="space-y-4">
            <input className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 outline-none focus:ring-2 focus:ring-purple-500" placeholder="Your Name" />
            <input className="w-full h-14 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 outline-none focus:ring-2 focus:ring-purple-500" placeholder="Email" />
            <textarea className="w-full min-h-[150px] bg-zinc-50 border border-zinc-100 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-purple-500" placeholder="Message" />
            <button className="w-full h-14 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20">Send Message</button>
          </form>
        </div>
      </div>
    </section>
  );
};
