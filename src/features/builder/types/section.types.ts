export type BuilderSectionTheme = "light" | "dark";

export type HeroSectionProps = {
  id?: string;
  className?: string;
  theme: BuilderSectionTheme;
  title: string;
  description: string;
  eyebrow?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
};

export type ServiceItem = {
  id: string;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
};

export type ServicesSectionProps = {
  id?: string;
  className?: string;
  theme: BuilderSectionTheme;
  title: string;
  description: string;
  items: ServiceItem[];
};

export type PricingPlan = {
  id: string;
  name: string;
  priceLabel: string;
  billingNote?: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  recommended?: boolean;
};

export type PricingSectionProps = {
  id?: string;
  className?: string;
  theme: BuilderSectionTheme;
  title: string;
  description: string;
  plans: PricingPlan[];
};

export type ContactsSectionProps = {
  id?: string;
  className?: string;
  theme: BuilderSectionTheme;
  title: string;
  description: string;
  email?: string;
  phone?: string;
  address?: string;
};
