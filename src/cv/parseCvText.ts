import type { Education, PersonalInfo, ProfileDate, WorkExperience } from "../core/profile/types";

export type EducationDraft = Omit<Education, "id"> & { rawText: string };
export type WorkExperienceDraft = Omit<WorkExperience, "id"> & { rawText: string };

export type CvExtractionDraft = {
  personal: Partial<PersonalInfo>;
  skills: string[];
  languages: string[];
  education: EducationDraft[];
  workExperience: WorkExperienceDraft[];
  otherSections: Record<string, string[]>;
  warnings: string[];
};

type SectionName = "education" | "workExperience" | "skills" | "languages";

const SECTION_ALIASES: Record<string, SectionName> = {
  education: "education",
  academic: "education",
  "academic background": "education",
  "academic history": "education",
  studies: "education",
  experience: "workExperience",
  "work experience": "workExperience",
  "professional experience": "workExperience",
  "professional background": "workExperience",
  "employment history": "workExperience",
  "work history": "workExperience",
  "career history": "workExperience",
  employment: "workExperience",
  skills: "skills",
  "technical skills": "skills",
  "core skills": "skills",
  competencies: "skills",
  expertise: "skills",
  technologies: "skills",
  "technical expertise": "skills",
  languages: "languages",
  language: "languages",
  "language skills": "languages",
  "spoken languages": "languages"
};

const OTHER_SECTION_KEYWORDS = [
  "publication",
  "award",
  "certification",
  "project",
  "volunteer",
  "interest",
  "hobb",
  "reference",
  "achievement",
  "honor",
  "course",
  "activity",
  "membership",
  "leadership",
  "summary",
  "profile",
  "objective",
  "additional information"
];

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeHeading(line: string): string {
  return line
    .toLowerCase()
    .replace(/[|:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getHeading(line: string): { name: SectionName } | { name: "other"; label: string } | null {
  const heading = normalizeHeading(line).replace(/[\-]+$/, "").trim();
  const supportedSection = SECTION_ALIASES[heading];
  if (supportedSection) {
    return { name: supportedSection };
  }

  const isShortHeading = heading.length <= 60 && heading.split(" ").length <= 6;
  const hasSectionKeyword = OTHER_SECTION_KEYWORDS.some((keyword) => heading.includes(keyword));
  if (isShortHeading && hasSectionKeyword) {
    return { name: "other", label: heading };
  }

  return null;
}

function findSections(lines: string[]): {
  sections: Record<SectionName, string[]>;
  otherSections: Record<string, string[]>;
} {
  const sections: Record<SectionName, string[]> = {
    education: [],
    workExperience: [],
    skills: [],
    languages: []
  };
  const otherSections: Record<string, string[]> = {};
  let currentSection: SectionName | null = null;
  let currentOtherSection: string | null = null;

  for (const line of lines) {
    const heading = getHeading(line);
    if (heading?.name === "other") {
      currentSection = null;
      currentOtherSection = heading.label;
      otherSections[currentOtherSection] ??= [];
      continue;
    }

    if (heading) {
      currentSection = heading.name;
      currentOtherSection = null;
      continue;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    } else if (currentOtherSection) {
      otherSections[currentOtherSection].push(line);
    }
  }

  return { sections, otherSections };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function emptyDate(): ProfileDate {
  return { value: "", precision: "month" };
}

const MONTH_NAMES = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTH_NUMBERS: Record<string, string> = {
  jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03", apr: "04", april: "04",
  may: "05", jun: "06", june: "06", jul: "07", july: "07", aug: "08", august: "08", sep: "09", september: "09",
  sept: "09", oct: "10", october: "10", nov: "11", november: "11", dec: "12", december: "12"
};

function parseDateToken(token: string, referenceYear?: string): ProfileDate | null {
  const normalized = token.toLowerCase().replace(/[.,]/g, "").trim();
  const monthYear = normalized.match(new RegExp(`^(${MONTH_NAMES})\\s+(\\d{4})$`, "i"));
  if (monthYear) return { value: `${monthYear[2]}-${MONTH_NUMBERS[monthYear[1].slice(0, 3)]}`, precision: "month" };
  const numericMonthYear = normalized.match(/^(\d{1,2})[\\/-](\d{4})$/);
  if (numericMonthYear && Number(numericMonthYear[1]) <= 12) return { value: `${numericMonthYear[2]}-${numericMonthYear[1].padStart(2, "0")}`, precision: "month" };
  const yearMonth = normalized.match(/^(\d{4})[\\/-](\d{1,2})$/);
  if (yearMonth && Number(yearMonth[2]) <= 12) return { value: `${yearMonth[1]}-${yearMonth[2].padStart(2, "0")}`, precision: "month" };
  if (/^\d{4}$/.test(normalized)) return { value: normalized, precision: "year" };
  if (/^(?:0?[1-9]|1[0-2])$/.test(normalized) && referenceYear?.includes("-")) return { value: normalized.padStart(2, "0"), precision: "month" };
  if (/^\d{2}$/.test(normalized) && referenceYear) return { value: `${referenceYear.slice(0, 2)}${normalized}`, precision: "year" };
  if (MONTH_NUMBERS[normalized]) return { value: MONTH_NUMBERS[normalized], precision: "month" };
  if (/^(?:0?[1-9]|1[0-2])$/.test(normalized)) return { value: normalized.padStart(2, "0"), precision: "month" };
  return null;
}

function dateAtoms(text: string): string[] {
  const pattern = new RegExp(`\\b(?:${MONTH_NAMES})\\.?\\b|\\b(?:0?[1-9]|1[0-2])[\\/-](?:19|20)\\d{2}\\b|\\b(?:19|20)\\d{2}\\b|\\b(?:0?[1-9]|1[0-2])\\b|\\b\\d{2}\\b`, "gi");
  return [...text.matchAll(pattern)].map((match) => match[0]);
}

function consumeDate(tokens: string[], index: number, referenceYear?: string): { date: ProfileDate | null; nextIndex: number } {
  const token = tokens[index];
  if (!token) return { date: null, nextIndex: index };

  const normalized = token.toLowerCase().replace(/[.]/g, "");
  const isMonth = Boolean(MONTH_NUMBERS[normalized]) || /^(?:0?[1-9]|1[0-2])$/.test(normalized);
  const nextToken = tokens[index + 1];

  if (isMonth && nextToken && /^\d{4}$/.test(nextToken)) {
    return { date: parseDateToken(`${token} ${nextToken}`), nextIndex: index + 2 };
  }

  return { date: parseDateToken(token, referenceYear), nextIndex: index + 1 };
}

function findDateLine(lines: string[]): string {
  const separator = /(?:-|\u2010|\u2011|\u2012|\u2013|\u2014|\u2015|\u2212|\bto\b)/i;
  return lines.find((line) => /\bexpected\b/i.test(line))
    ?? lines.find((line) => separator.test(line) && dateAtoms(line).length >= 2)
    ?? lines.find((line) => dateAtoms(line).length >= 2)
    ?? "";
}

function extractDateRange(line: string): { startDate: ProfileDate; endDate: ProfileDate } {
  const expectedDate = line.match(new RegExp(`expected\\s+((?:${MONTH_NAMES})\\.?\\s+(?:19|20)\\d{2}|(?:19|20)\\d{2})`, "i"));
  if (expectedDate) {
    const expectedIndex = expectedDate.index ?? line.length;
    const start = consumeDate(dateAtoms(line.slice(0, expectedIndex)), 0);
    return { startDate: start.date ?? emptyDate(), endDate: parseDateToken(expectedDate[1]) ?? emptyDate() };
  }

  const tokens = dateAtoms(line);
  const start = consumeDate(tokens, 0);
  if (!start.date) return { startDate: emptyDate(), endDate: emptyDate() };
  const end = consumeDate(tokens, start.nextIndex, start.date.value);

  return { startDate: start.date, endDate: end.date ?? emptyDate() };
}

function removeDates(text: string): string {
  return text
    .replace(/\b((?:19|20)\d{2})\s*[-–—]\s*(\d{2}|(?:19|20)\d{2})\b/g, "")
    .replace(new RegExp(`(?:${MONTH_NAMES})\\.?\\s+(?:19|20)\\d{2}|(?:19|20)\\d{2}|(?:${MONTH_NAMES})`, "gi"), "")
    .replace(/\b(?:exp\.?|present|current|now)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[,.]+\s*$/, "")
    .trim();
}

function extractGrade(text: string): string {
  const grade = text.match(/(?<![\d.])\b[1-9]\d?\s*\/\s*[1-9]\d?(?:\s+(?:cum laude|with honors|honours))?/i)?.[0];
  return grade ?? text.match(/\b(?:cum laude|with honors|honours)\b/i)?.[0] ?? "";
}

function extractGpa(text: string): string {
  const match = text.match(/\bG\.?\s*P\.?\s*A\.?\s*[:\-]?\s*(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)/i)
    ?? text.match(/\baverage\s+(?:of\s+)?(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?)/i);
  return match?.[1]?.replace(/\s+/g, "") ?? "";
}

function groupEntryLines(lines: string[], section: SectionName): string[][] {
  const groups: string[][] = [];
  const dateValue = `(?:(?:${MONTH_NAMES})\\.?\\s+(?:19|20)\\d{2}|\\d{1,2}[\\/-](?:19|20)\\d{2}|(?:19|20)\\d{2}|(?:${MONTH_NAMES})\\.?|\\d{1,2})`;
  const dateRangePattern = new RegExp(
    `${dateValue}\\s*(?:-|\\u2013|\\u2014|to)\\s*(?:(?:exp\\.?\\s*)?${dateValue}|present|current|now)`,
    "i"
  );

  let entryClosed = false;
  let hasBulletContent = false;

  for (const line of lines) {
    const isBullet = /^[-*\u2022\u25aa\u25cf]\s*/.test(line);
    const isEducationHeader = /^(?:m\.?s\.?|ms|msc|m\.?a\.?|mba|b\.?s\.?|bs|bsc|b\.?a\.?|ba|bachelor(?:'s)?|master(?:'s)?|phd|doctorate)(?=\s|$)/i.test(line) || /^alta scuola politecnica\b/i.test(line);
    const isEducationDate = /^(?:expected\s+)?(?:[A-Za-z]+\.?\s+)?(?:19|20)\d{2}(?:\s*[-\u2013\u2014]\s*(?:[A-Za-z]+\.?\s+)?(?:19|20)\d{2})?$/i.test(line);
    const isWorkHeader = !isBullet && dateRangePattern.test(line) && line.includes(",");
    const currentEducationHasDegree = groups[groups.length - 1]?.some((existingLine) => /^(?:m\.?s\.?|ms|msc|m\.?a\.?|mba|b\.?s\.?|bs|bsc|b\.?a\.?|ba|bachelor(?:'s)?|master(?:'s)?|phd|doctorate|doctoral)(?=\s|$)/i.test(existingLine)) ?? false;
    const startsNewEntry = section === "education"
      ? isEducationHeader && groups.length > 0 && currentEducationHasDegree
      : isWorkHeader && groups.length > 0;
    const looksLikeEntry = groups.length === 0 || startsNewEntry || (!isBullet && entryClosed && !hasBulletContent);

    if (looksLikeEntry || groups.length === 0) {
      groups.push([line]);
      entryClosed = false;
      hasBulletContent = false;
    } else {
      groups[groups.length - 1].push(line);
    }

    if (section === "workExperience" && isBullet) {
      hasBulletContent = true;
      entryClosed = false;
    }

    if (section === "education" && isEducationDate) {
      entryClosed = true;
    }

    if (section === "workExperience" && dateRangePattern.test(line) && groups[groups.length - 1].length > 1) {
      entryClosed = true;
    }
  }
  return groups;
}

function normalizeDegree(value: string): string {
  const normalized = value.toLowerCase().replace(/[.,]/g, "").trim();
  if (/^(?:ms|msc|master|master's)$/.test(normalized)) return "Master degree";
  if (/^(?:bs|bsc|bachelor|bachelor's)$/.test(normalized)) return "Bachelor degree";
  if (/^(?:phd|doctorate|doctoral)$/.test(normalized)) return "PhD";
  return value.trim();
}

function cleanExtractedText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[|;,]+\s*$/, "")
    .replace(/\s*[-\u2010\u2011\u2012\u2013\u2014\u2015\u2212]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanFieldOfStudy(value: string): string {
  return cleanExtractedText(value)
    .replace(/\s+[tT]\.?(?:\s*[-\u2010\u2011\u2012\u2013\u2014\u2015\u2212])?\s*$/, "")
    .trim();
}

function cleanInstitution(value: string): string {
  return cleanExtractedText(value)
    .replace(/\s+(?:Milan|Rome|Florence|Turin|Ghent|Paris|London|Berlin),\s*(?:Italy|Belgium|France|United Kingdom|Germany)\s*$/i, "")
    .replace(/\s*[-\u2010\u2011\u2012\u2013\u2014\u2015\u2212]?\s*(?:expected|current|present)\b.*$/i, "")
    .replace(/\s*[-\u2010\u2011\u2012\u2013\u2014\u2015\u2212]\s*$/, "")
    .trim();
}

function isInstitutionName(value: string): boolean {
  return /\b(?:university|college|institute|institution|politecnico|polytechnic|school|academy|eurecom)\b/i.test(value);
}

function splitInstitutionLine(value: string): { institution: string; fieldPrefix: string } {
  const line = value.replace(/^\s*[,;:]\s*/, "");
  const institutionMatch = line.match(/\b(?:university|college|institute|institution|politecnico|polytechnic|school|academy|eurecom)\b/i);
  if (institutionMatch?.index === undefined) {
    return { institution: cleanInstitution(line), fieldPrefix: "" };
  }

  return {
    institution: cleanInstitution(line.slice(institutionMatch.index)),
    fieldPrefix: cleanFieldOfStudy(line.slice(0, institutionMatch.index))
  };
}

function parseEducationEntries(lines: string[]): EducationDraft[] {
  return groupEntryLines(lines, "education").map((group) => {
    const header = group[0];
    const cleanHeader = removeDates(header).trim();
    const degreeLineIndex = group.findIndex((line) => /^(?:m\.?s\.?|ms|msc|m\.?a\.?|mba|b\.?s\.?|bs|bsc|b\.?a\.?|ba|bachelor(?:'s)?|master(?:'s)?|phd|doctorate|doctoral)\.?(?=\s|$)/i.test(line));
    const degreeLine = degreeLineIndex >= 0 ? removeDates(group[degreeLineIndex]).trim() : cleanHeader;
    const degreeToken = degreeLine.match(/^(m\.?s\.?|ms|msc|m\.?a\.?|mba|b\.?s\.?|bs|bsc|b\.?a\.?|ba|bachelor(?:'s)?|master(?:'s)?|phd|doctorate|doctoral)\.?(?=\s|$)/i)?.[1];
    const degree = degreeToken ? normalizeDegree(degreeToken) : normalizeDegree(cleanHeader.split(/\s*,\s*/)[0] ?? "");
    const remainder = degreeToken ? degreeLine.slice(degreeToken.length).replace(/^\.\s*/, "").trim() : "";
    const inlineParts = remainder
      .split(/\s+[-\u2010\u2011\u2012\u2013\u2014\u2015\u2212]\s+|\s*,\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    const fieldMatch = degreeLine.match(/\b(?:in|of)\s+([A-Za-z][A-Za-z &'/-]*?)(?=\s+[-\u2010\u2011\u2012\u2013\u2014\u2015\u2212]\s+|\s+(?:expected|current|present)\b|$)/i);
    let fieldFromDegree = fieldMatch?.[1]?.trim() ?? inlineParts[0]?.replace(/^(?:in|of)\s+/i, "").trim() ?? "";
    const inlineInstitutionIndex = inlineParts.findIndex((part) => isInstitutionName(part));
    const fieldBeforeInstitution = inlineInstitutionIndex > 0
      ? inlineParts[inlineInstitutionIndex - 1]?.replace(/^(?:in|of)\s+/i, "").trim()
      : "";
    if (fieldBeforeInstitution && fieldBeforeInstitution.length > fieldFromDegree.length) {
      fieldFromDegree = fieldBeforeInstitution;
    }
    const grade = extractGrade(group.join(" "));
    const gpa = extractGpa(group.join(" "));
    const consumed = new Set<number>();
    let institution = inlineParts.find((part) => isInstitutionName(part)) ?? "";
    let fieldOfStudy = fieldFromDegree;

    if (institution) {
      const splitInlineInstitution = splitInstitutionLine(institution);
      institution = splitInlineInstitution.institution;
      if (splitInlineInstitution.fieldPrefix && splitInlineInstitution.fieldPrefix.length > fieldOfStudy.length) {
        fieldOfStudy = splitInlineInstitution.fieldPrefix;
      }
    }

    const institutionLineIndex = group.findIndex((line, index) => index !== degreeLineIndex && isInstitutionName(line));
    if (!institution && institutionLineIndex >= 0) {
      const splitInstitution = splitInstitutionLine(group[institutionLineIndex]);
      institution = splitInstitution.institution;
      if (splitInstitution.fieldPrefix && splitInstitution.fieldPrefix.length > fieldOfStudy.length) {
        fieldOfStudy = splitInstitution.fieldPrefix;
      }
    }
    if (institutionLineIndex >= 0) consumed.add(institutionLineIndex);
    if (degreeLineIndex >= 0) consumed.add(degreeLineIndex);

    const fieldLineIndex = group.findIndex((line, index) => index !== degreeLineIndex && /^,?\s*(?:in|of)?\s*[A-Za-z][A-Za-z ]+$/i.test(line));
    if (!fieldOfStudy && fieldLineIndex >= 0) {
      fieldOfStudy = group[fieldLineIndex].replace(/^,\s*/, "").trim();
      consumed.add(fieldLineIndex);
    }

    const inlineDescription = inlineParts
      .filter((part) => part !== fieldOfStudy && part !== institution)
      .join(", ")
      .replace(grade, "")
      .replace(/\b(?:expected|current|present)\b.*$/i, "")
      .trim();
    const descriptionLines = group.slice(1).filter((line, index) => !consumed.has(index + 1) && !/^expected\b/i.test(line) && !/^(?:[A-Za-z]+\.?\s+)?(?:19|20)\d{2}(?:\s*[-\u2013\u2014]|$)/.test(line));
    return {
      rawText: group.join(" "),
      institution: cleanInstitution(institution.replace(grade, "")),
      degree,
      fieldOfStudy: cleanFieldOfStudy(fieldOfStudy),
      gpa,
      finalGrade: grade,
      ...extractDateRange(findDateLine(group)),
      description: [inlineDescription, ...descriptionLines].filter(Boolean).join(" ")
    };
  });
}

function parseWorkExperienceEntries(lines: string[]): WorkExperienceDraft[] {
  return groupEntryLines(lines, "workExperience").map((group) => {
    const header = group[0];
    const cleanHeader = removeDates(header);
    const parts = cleanHeader.split(/\s*,\s*/).map((part) => part.trim()).filter(Boolean);
    const roleLineIndex = group.findIndex((line, index) => index > 0 && /open source contributor|software engineer|software developer|phd researcher|research intern|researcher|intern|developer|engineer/i.test(line));
    const roleMatch = group[roleLineIndex]?.match(/open source contributor|software engineer|software developer|phd researcher|research intern|researcher|intern|developer|engineer/i);
    const roleIndex = group.findIndex((line, index) => {
      if (index === 0 || !/^[A-Za-z][A-Za-z\s+&-]{4,}$/.test(line.trim())) return false;
      const letters = line.replace(/[^A-Za-z]/g, "");
      const uppercaseLetters = letters.replace(/[^A-Z]/g, "");
      return letters.length > 4 && uppercaseLetters.length / letters.length >= 0.7;
    });
    const hasStructuredHeader = parts.length > 1;
    const title = roleMatch
        ? roleMatch[0].toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
      : hasStructuredHeader
        ? parts[0]
      : roleIndex > 0
        ? group[roleIndex].trim().toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
        : parts[0] ?? "Contributor";
    const companyAndLocation = hasStructuredHeader ? parts.slice(1).join(", ") : cleanHeader.split("|")[0].trim();
    const locationLine = group.find((line) => /\b(?:remote|hybrid|on[- ]site)\b/i.test(line));
    const locationLabel = locationLine?.match(/\b(?:remote|hybrid|on[- ]site)\b/i)?.[0];
    const cityCountryLine = group.find((line) => /^[A-Za-zÀ-ÖØ-öø-ÿ .'-]+,\s+[A-Za-zÀ-ÖØ-öø-ÿ .'-]+$/.test(line.trim()));
    const locationParts = companyAndLocation.split(/\s+[-\u2013\u2014]\s+/);
    const descriptionStart = hasStructuredHeader ? 1 : roleLineIndex > 0 ? roleLineIndex + 1 : roleIndex > 0 ? roleIndex + 1 : 1;
    return {
      rawText: group.join(" "),
      company: (locationParts[0] ?? "").replace(/\s+\d+\s*$/, "").trim() || cleanHeader.split("|")[0].trim(),
      title,
      location: cleanExtractedText(locationParts.slice(1).join(" - ").replace(/^[-\u2013\u2014]\s*/, "")) || cleanExtractedText(locationLabel ?? "") || cleanExtractedText(cityCountryLine ?? ""),
      ...extractDateRange(findDateLine(group)),
      description: group.slice(descriptionStart).filter((line) => line !== locationLine).join(" ")
    };
  });
}

function extractListItems(lines: string[]): string[] {
  return unique(
    lines.flatMap((line) => line.split(/[•|,;]/)).map((item) => item.replace(/^[-*]\s*/, ""))
  );
}

function extractEmail(text: string): string | undefined {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function extractPhone(text: string): string | undefined {
  const candidates = text.match(/\+?\d[\d\s().-]{8,}\d/g) ?? [];
  return candidates.map((candidate) => candidate.replace(/\D/g, "")).find((digits) => digits.length >= 10 && digits.length <= 15);
}

function extractUrls(text: string): string[] {
  return unique(
    (text.match(/https?:\/\/[^\s<>()]+/gi) ?? []).map((url) => url.replace(/[),.;]+$/, ""))
  );
}

function classifyLinks(urls: string[]): Pick<PersonalInfo, "linkedin" | "github" | "portfolio" | "otherLinks"> {
  const linkedin = urls.find((url) => url.toLowerCase().includes("linkedin.com")) ?? "";
  const github = urls.find((url) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.toLowerCase() === "github.com" && parsed.pathname.split("/").filter(Boolean).length === 1;
    } catch {
      return false;
    }
  }) ?? "";
  const otherUrls = urls.filter((url) => {
    if (url === linkedin || url === github) return false;
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();
      const isGithubDetail = hostname === "github.com" || hostname === "gist.github.com";
      const isPaperLink = ["doi.org", "arxiv.org", "openreview.net", "aclanthology.org", "dl.acm.org", "ieeexplore.ieee.org", "semanticscholar.org"].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
      const isPaperPath = /\/(?:paper|papers|publication|publications|proceedings)\b/.test(path);
      return !isGithubDetail && !isPaperLink && !isPaperPath;
    } catch {
      return false;
    }
  });
  const portfolio = otherUrls.find((url) => !/scholar\.google\./i.test(url)) ?? "";

  return {
    linkedin,
    github,
    portfolio,
    otherLinks: otherUrls.filter((url) => url !== portfolio)
  };
}

function extractName(lines: string[]): string | undefined {
  const excludedWords = /resume|curriculum|vitae|cv|profile|experience|education|skills|languages/i;
  const roleLine = /^(?:software\s+engineer|software\s+developer|phd\s+researcher|researcher|student|engineer|developer|scientist|professor|prof\.?|manager|analyst|designer|consultant|intern|architect|specialist)(?:\s+.*)?$/i;
  const namePart = /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]+$/;
  const nameParts: string[] = [];

  for (const line of lines.slice(0, 10)) {
    if (excludedWords.test(line) || /[@\d]|https?:\/\//i.test(line)) {
      continue;
    }

    const candidate = line.replace(/\s*[-|].*$/, "").trim();
    const roleMatch = candidate.match(/\b(?:software\s+engineer|software\s+developer|phd\s+researcher|researcher|engineer|developer|scientist|professor|manager|analyst|designer|consultant|intern|architect|specialist)\b.*$/i);
    if (roleMatch) {
      const nameBeforeRole = candidate.slice(0, roleMatch.index).trim();
      if (nameBeforeRole && nameBeforeRole.split(/\s+/).every((word) => namePart.test(word))) {
        return nameBeforeRole;
      }
      if (nameParts.length > 0) return nameParts.join(" ");
      continue;
    }

    if (roleLine.test(candidate)) {
      return nameParts.length > 0 ? nameParts.join(" ") : undefined;
    }

    const words = candidate.split(/\s+/);
    if (words.length <= 3 && words.every((word) => namePart.test(word))) {
      nameParts.push(...words);
      if (nameParts.length >= 4) break;
    }
  }

  return nameParts.length >= 2 ? nameParts.join(" ") : undefined;
}

export function parseCvText(text: string, linkedUrls: string[] = []): CvExtractionDraft {
  const lines = normalizeLines(text);
  const { sections, otherSections } = findSections(lines);
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const urls = unique([...extractUrls(text), ...linkedUrls]);
  const classifiedLinks = classifyLinks(urls);
  const personal: Partial<PersonalInfo> = {};
  const name = extractName(lines);
  const warnings: string[] = [];

  if (name) personal.fullName = name;
  if (email) personal.email = email;
  if (phone) personal.phone = phone;
  if (classifiedLinks.linkedin) personal.linkedin = classifiedLinks.linkedin;
  if (classifiedLinks.github) personal.github = classifiedLinks.github;
  if (classifiedLinks.portfolio) personal.portfolio = classifiedLinks.portfolio;
  if (classifiedLinks.otherLinks.length > 0) personal.otherLinks = classifiedLinks.otherLinks;

  if (!name) warnings.push("Name could not be identified with confidence.");
  if (!email) warnings.push("No email address was found.");
  if (!phone) warnings.push("No 10-digit phone number was found.");

  return {
    personal,
    skills: extractListItems(sections.skills),
    languages: extractListItems(sections.languages),
    education: parseEducationEntries(sections.education),
    workExperience: parseWorkExperienceEntries(sections.workExperience),
    otherSections,
    warnings
  };
}
