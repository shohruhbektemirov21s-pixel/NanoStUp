import type { WebsiteSection } from "@/lib/ai/website-schema.zod";

import { escapeAttr, escapeHtml } from "../escape-html";

export function renderHtmlSection(section: WebsiteSection): string {
  switch (section.type) {
    case "hero": {
      const primary = section.primaryCta
        ? `<a class="btn primary" href="${escapeAttr(section.primaryCta.href)}">${escapeHtml(section.primaryCta.label)}</a>`
        : "";
      const secondary = section.secondaryCta
        ? `<a class="btn ghost" href="${escapeAttr(section.secondaryCta.href)}">${escapeHtml(section.secondaryCta.label)}</a>`
        : "";
      const badge = section.badge ? `<p class="badge">${escapeHtml(section.badge)}</p>` : "";
      const subtitle = section.subtitle ? `<p class="lead">${escapeHtml(section.subtitle)}</p>` : "";
      return `<section class="block hero" id="${escapeAttr(section.id)}">
        ${badge}
        <h1>${escapeHtml(section.title)}</h1>
        ${subtitle}
        <div class="actions">${primary}${secondary}</div>
      </section>`;
    }
    case "features": {
      const items = section.items
        .map(
          (item) => `<li class="card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </li>`,
        )
        .join("");
      return `<section class="block features" id="${escapeAttr(section.id)}">
        <h2>${escapeHtml(section.heading)}</h2>
        <ul class="grid">${items}</ul>
      </section>`;
    }
    case "cta": {
      return `<section class="block cta" id="${escapeAttr(section.id)}">
        <h2>${escapeHtml(section.title)}</h2>
        ${section.description ? `<p class="muted">${escapeHtml(section.description)}</p>` : ""}
        <a class="btn primary" href="${escapeAttr(section.button.href)}">${escapeHtml(section.button.label)}</a>
      </section>`;
    }
    case "footer": {
      const copy = section.copyright ? `<p class="small">${escapeHtml(section.copyright)}</p>` : "";
      return `<footer class="block footer" id="${escapeAttr(section.id)}">
        <p class="tagline">${escapeHtml(section.tagline)}</p>
        ${copy}
      </footer>`;
    }
    case "contact": {
      const lines: string[] = [];
      if (section.email) {
        lines.push(
          `<p><span class="label">Email</span> <a href="mailto:${escapeAttr(section.email)}">${escapeHtml(section.email)}</a></p>`,
        );
      }
      if (section.phone) {
        const tel = section.phone.replace(/\s+/g, "");
        lines.push(
          `<p><span class="label">Telefon</span> <a href="tel:${escapeAttr(tel)}">${escapeHtml(section.phone)}</a></p>`,
        );
      }
      if (section.address) {
        lines.push(`<p><span class="label">Manzil</span> ${escapeHtml(section.address)}</p>`);
      }
      return `<section class="block contact" id="${escapeAttr(section.id)}">
        <h2>${escapeHtml(section.heading)}</h2>
        <div class="contact-lines">${lines.join("")}</div>
      </section>`;
    }
    case "pricing": {
      const tiers = section.tiers
        .map(
          (tier) => `<div class="price-card">
          <h3>${escapeHtml(tier.name)}</h3>
          <p class="price">${escapeHtml(tier.price)}</p>
          <p class="muted">${escapeHtml(tier.description)}</p>
          <ul>${tier.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
          ${
            tier.cta
              ? `<a class="btn primary" href="${escapeAttr(tier.cta.href)}">${escapeHtml(tier.cta.label)}</a>`
              : ""
          }
        </div>`,
        )
        .join("");
      return `<section class="block pricing" id="${escapeAttr(section.id)}">
        <h2>${escapeHtml(section.heading)}</h2>
        ${section.subheading ? `<p class="lead">${escapeHtml(section.subheading)}</p>` : ""}
        <div class="price-grid">${tiers}</div>
      </section>`;
    }
    case "testimonials": {
      const items = section.items
        .map(
          (it) => `<blockquote class="quote-card">
          <p>“${escapeHtml(it.quote)}”</p>
          <footer>— ${escapeHtml(it.author)}${it.role ? `, ${escapeHtml(it.role)}` : ""}</footer>
        </blockquote>`,
        )
        .join("");
      return `<section class="block testimonials" id="${escapeAttr(section.id)}">
        <h2>${escapeHtml(section.heading)}</h2>
        <div class="quote-grid">${items}</div>
      </section>`;
    }
    case "faq": {
      const items = section.items
        .map(
          (it) => `<details class="faq-item">
          <summary>${escapeHtml(it.question)}</summary>
          <p>${escapeHtml(it.answer)}</p>
        </details>`,
        )
        .join("");
      return `<section class="block faq" id="${escapeAttr(section.id)}">
        <h2>${escapeHtml(section.heading)}</h2>
        <div class="faq-list">${items}</div>
      </section>`;
    }
    case "blogTeaser": {
      const posts = section.posts
        .map(
          (post) => `<article class="blog-card">
          <h3><a href="${escapeAttr(post.href)}">${escapeHtml(post.title)}</a></h3>
          <p>${escapeHtml(post.summary)}</p>
        </article>`,
        )
        .join("");
      return `<section class="block blog-teaser" id="${escapeAttr(section.id)}">
        <h2>${escapeHtml(section.heading)}</h2>
        <div class="blog-grid">${posts}</div>
      </section>`;
    }
    case "textBlock": {
      const paras = section.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      return `<section class="block text-block" id="${escapeAttr(section.id)}">
        ${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ""}
        <div class="prose">${paras}</div>
      </section>`;
    }
    case "trustStrip": {
      const lis = section.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
      return `<section class="block trust" id="${escapeAttr(section.id)}">
        ${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ""}
        <ul class="trust-list">${lis}</ul>
      </section>`;
    }
    case "leadForm": {
      const fields = section.fields
        .map((f) => {
          if (f === "message") {
            return `<label>${escapeHtml(f)}<textarea name="${escapeAttr(f)}" rows="4"></textarea></label>`;
          }
          return `<label>${escapeHtml(f)}<input type="${f === "email" ? "email" : "text"}" name="${escapeAttr(f)}" /></label>`;
        })
        .join("");
      const ep = section.endpointPlaceholder
        ? `<p class="small muted">Endpoint: ${escapeHtml(section.endpointPlaceholder)}</p>`
        : `<p class="small muted">Form handler — connect your API later.</p>`;
      return `<section class="block lead-form" id="${escapeAttr(section.id)}">
        <h2>${escapeHtml(section.heading)}</h2>
        ${section.subheading ? `<p class="lead">${escapeHtml(section.subheading)}</p>` : ""}
        <form class="stack-form">${fields}<button type="button" class="btn primary">Send</button></form>
        ${ep}
      </section>`;
    }
    case "gallery": {
      const items = section.items
        .map(
          (it) => `<figure class="gallery-card">
          <div class="ph" role="img" aria-label="${escapeAttr(it.imageAlt)}"></div>
          <figcaption><strong>${escapeHtml(it.title)}</strong><p>${escapeHtml(it.description)}</p></figcaption>
        </figure>`,
        )
        .join("");
      return `<section class="block gallery" id="${escapeAttr(section.id)}">
        <h2>${escapeHtml(section.heading)}</h2>
        <div class="gallery-grid">${items}</div>
      </section>`;
    }
    case "custom": {
      return `<section class="block custom" id="${escapeAttr(section.id)}">
        ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}
        <div class="custom-body">${escapeHtml(section.body)}</div>
      </section>`;
    }
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}
