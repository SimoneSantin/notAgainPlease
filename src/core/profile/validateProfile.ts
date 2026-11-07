import type { Profile, ProfileDate } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{10,15}$/;
const YEAR_PATTERN = /^\d{4}$/;
const MONTH_PATTERN = /^(?:\d{4}-)?\d{2}$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(date: ProfileDate): boolean {
  if (!date.value) return true;
  if (date.precision === "year") return YEAR_PATTERN.test(date.value);
  if (date.precision === "month") {
    if (!MONTH_PATTERN.test(date.value)) return false;
    const month = Number(date.value.slice(-2));
    return month >= 1 && month <= 12;
  }

  if (!DAY_PATTERN.test(date.value)) return false;
  const parsed = new Date(`${date.value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date.value;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function comparableDate(date: ProfileDate): string | null {
  if (!date.value) return null;
  if (date.precision === "day") return date.value;
  if (date.precision === "month" && /^\d{4}-\d{2}$/.test(date.value)) return `${date.value}-01`;
  if (date.precision === "year" && /^\d{4}$/.test(date.value)) return `${date.value}-01-01`;
  return null;
}

function validateDateRange(startDate: ProfileDate, endDate: ProfileDate, label: string): string | null {
  if (startDate.value && !isValidDate(startDate)) {
    return `${label}: start date is not valid.`;
  }

  if (endDate.value && !isValidDate(endDate)) {
    return `${label}: end date is not valid.`;
  }

  const comparableStart = comparableDate(startDate);
  const comparableEnd = comparableDate(endDate);
  if (comparableStart && comparableEnd && comparableStart > comparableEnd) {
    return `${label}: start date must be before end date.`;
  }

  return null;
}

export function validateProfile(profile: Profile): string | null {
  if (profile.personal.email && !EMAIL_PATTERN.test(profile.personal.email.trim())) {
    return "Email must be valid.";
  }

  if (profile.personal.phone && !PHONE_PATTERN.test(profile.personal.phone.trim())) {
    return "Phone must contain between 10 and 15 digits.";
  }

  if (profile.personal.portfolio && !isValidUrl(profile.personal.portfolio)) {
    return "Portfolio must be a valid HTTP or HTTPS URL.";
  }

  if (profile.personal.linkedin && !isValidUrl(profile.personal.linkedin)) {
    return "LinkedIn must be a valid HTTP or HTTPS URL.";
  }

  for (const education of profile.education) {
    if (!education.institution.trim()) {
      return "Every education entry needs an institution.";
    }

    if (!education.degree.trim()) {
      return "Every education entry needs a degree.";
    }

    if (education.gpa && (!Number.isFinite(Number(education.gpa)) || Number(education.gpa) < 0)) {
      return "GPA must be a non-negative number.";
    }

    const dateError = validateDateRange(education.startDate, education.endDate, "Education");
    if (dateError) {
      return dateError;
    }
  }

  for (const experience of profile.workExperience) {
    if (!experience.company.trim()) {
      return "Every work experience entry needs a company.";
    }

    if (!experience.title.trim()) {
      return "Every work experience entry needs a job title.";
    }

    const dateError = validateDateRange(experience.startDate, experience.endDate, "Work experience");
    if (dateError) {
      return dateError;
    }
  }

  return null;
}
