import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createEmptyEducation,
  createEmptyProfile,
  createEmptyWorkExperience
} from "../../core/profile/defaultProfile";
import type { Education, Profile, ProfileDate, WorkExperience } from "../../core/profile/types";
import { validateProfile } from "../../core/profile/validateProfile";
import { extractPdfText, type PdfTextResult } from "../../cv/extractPdfText";
import { parseCvText, type CvExtractionDraft } from "../../cv/parseCvText";
import { deleteProfile, loadProfile, saveProfile } from "../../storage/profileStorage";
import "./styles.css";

type ListFieldName = "skills" | "languages";

function splitList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

const MONTH_VALUES: Record<string, string> = {
  jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
  apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
  aug: "08", august: "08", sep: "09", sept: "09", september: "09", oct: "10",
  october: "10", nov: "11", november: "11", dec: "12", december: "12"
};

function parseDateInput(input: string, previous: ProfileDate): ProfileDate {
  const value = input.trim();
  if (!value) return { value: "", precision: previous.precision };

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { value, precision: "day" };
  if (/^\d{4}-\d{2}$/.test(value)) return { value, precision: "month" };
  if (/^\d{1,2}\/\d{4}$/.test(value)) {
    const [month, year] = value.split("/");
    return { value: `${year}-${month.padStart(2, "0")}`, precision: "month" };
  }

  const namedMonth = value.match(/^([A-Za-z]+)\.?\s+(\d{4})$/);
  if (namedMonth) {
    const month = MONTH_VALUES[namedMonth[1].toLowerCase()];
    if (month) return { value: `${namedMonth[2]}-${month}`, precision: "month" };
  }

  if (/^\d{4}$/.test(value)) return { value, precision: "year" };
  if (/^(?:0?[1-9]|1[0-2])$/.test(value)) return { value: value.padStart(2, "0"), precision: "month" };
  return { ...previous, value };
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange
}: {
  label: string;
  value: ProfileDate;
  onChange: (value: ProfileDate) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="date-field">
        <input
          type="text"
          value={value.value}
          placeholder="e.g. May 2024, 09/2024 or 2024"
          onChange={(event) => onChange(parseDateInput(event.target.value, value))}
        />
      </div>
    </label>
  );
}

function EducationEditor({
  education,
  onChange,
  onRemove
}: {
  education: Education;
  onChange: (education: Education) => void;
  onRemove: () => void;
}) {
  const update = (key: keyof Education, value: string) => onChange({ ...education, [key]: value });

  return (
    <article className="item-card">
      <div className="item-header">
        <h3>Education</h3>
        <button type="button" className="secondary-button" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="field-grid">
        <Field label="Institution" value={education.institution} onChange={(value) => update("institution", value)} />
        <Field label="Degree" value={education.degree} onChange={(value) => update("degree", value)} />
        <Field label="Field of study" value={education.fieldOfStudy} onChange={(value) => update("fieldOfStudy", value)} />
        <Field label="GPA" value={education.gpa} onChange={(value) => update("gpa", value)} />
        <Field label="Final grade" value={education.finalGrade} onChange={(value) => update("finalGrade", value)} />
        <DateField label="Start date" value={education.startDate} onChange={(value) => onChange({ ...education, startDate: value })} />
        <DateField label="End date" value={education.endDate} onChange={(value) => onChange({ ...education, endDate: value })} />
      </div>
      <label className="field">
        <span>Description</span>
        <textarea value={education.description} onChange={(event) => update("description", event.target.value)} rows={4} />
      </label>
    </article>
  );
}

function WorkExperienceEditor({
  experience,
  onChange,
  onRemove
}: {
  experience: WorkExperience;
  onChange: (experience: WorkExperience) => void;
  onRemove: () => void;
}) {
  const update = (key: keyof WorkExperience, value: string) => onChange({ ...experience, [key]: value });

  return (
    <article className="item-card">
      <div className="item-header">
        <h3>Work experience</h3>
        <button type="button" className="secondary-button" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="field-grid">
        <Field label="Company" value={experience.company} onChange={(value) => update("company", value)} />
        <Field label="Job title" value={experience.title} onChange={(value) => update("title", value)} />
        <Field label="Location" value={experience.location} onChange={(value) => update("location", value)} />
        <DateField label="Start date" value={experience.startDate} onChange={(value) => onChange({ ...experience, startDate: value })} />
        <DateField label="End date" value={experience.endDate} onChange={(value) => onChange({ ...experience, endDate: value })} />
      </div>
      <label className="field">
        <span>Description</span>
        <textarea value={experience.description} onChange={(event) => update("description", event.target.value)} rows={4} />
      </label>
    </article>
  );
}

function DraftList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="draft-list">
      <h4>{label}</h4>
      {values.length > 0 ? (
        <ul>
          {values.map((value, index) => <li key={`${label}-${index}`}>{value}</li>)}
        </ul>
      ) : (
        <p>Nothing detected.</p>
      )}
    </div>
  );
}

function formatDraftDate(date: ProfileDate): string {
  if (!date.value) {
    return "Not detected";
  }

  return `${date.value} (${date.precision})`;
}

function DraftEntryList({
  label,
  entries,
  type
}: {
  label: string;
  entries: CvExtractionDraft["education"] | CvExtractionDraft["workExperience"];
  type: "education" | "work";
}) {
  return (
    <div className="draft-list">
      <h4>{label}</h4>
      {entries.length > 0 ? entries.map((entry, index) => {
        if ("degree" in entry) {
          return (
            <article className="draft-entry" key={`${type}-${index}`}>
              <strong>{entry.degree || "Education entry"}</strong>
              <p>{entry.institution || "Institution not detected"}</p>
              {entry.fieldOfStudy && <p>Field: {entry.fieldOfStudy}</p>}
              {entry.finalGrade && <p>Final grade: {entry.finalGrade}</p>}
              <p>Dates: {formatDraftDate(entry.startDate)} - {formatDraftDate(entry.endDate)}</p>
              {entry.description && <p>Description: {entry.description}</p>}
              <small>Source: {entry.rawText}</small>
            </article>
          );
        }

        return (
          <article className="draft-entry" key={`${type}-${index}`}>
            <strong>{entry.title || "Work entry"}</strong>
            <p>{entry.company || "Company not detected"}</p>
            {entry.location && <p>{entry.location}</p>}
            <p>Dates: {formatDraftDate(entry.startDate)} - {formatDraftDate(entry.endDate)}</p>
            {entry.description && <p>Description: {entry.description}</p>}
            <small>Source: {entry.rawText}</small>
          </article>
        );
      }) : <p>Nothing detected.</p>}
    </div>
  );
}

function Options() {
  const [profile, setProfile] = useState<Profile>(createEmptyProfile);
  const [status, setStatus] = useState("Loading profile...");
  const [cvResult, setCvResult] = useState<PdfTextResult | null>(null);
  const [cvDraft, setCvDraft] = useState<CvExtractionDraft | null>(null);
  const [cvStatus, setCvStatus] = useState("");
  const [cvImportOpen, setCvImportOpen] = useState(true);

  useEffect(() => {
    loadProfile()
      .then((savedProfile) => {
        setProfile(savedProfile);
        setStatus("");
      })
      .catch(() => setStatus("Could not load the profile."));
  }, []);

  const updatePersonal = (key: keyof Profile["personal"], value: string) => {
    setProfile((current) => ({ ...current, personal: { ...current.personal, [key]: value } }));
  };

  const updateList = (field: ListFieldName, value: string) => {
    setProfile((current) => ({ ...current, [field]: splitList(value) }));
  };

  const handleSave = async () => {
    const validationError = validateProfile(profile);
    if (validationError) {
      setStatus(validationError);
      return;
    }

    await saveProfile(profile);
    setStatus("Profile saved locally.");
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete the saved profile from this browser?")) {
      return;
    }

    await deleteProfile();
    setProfile(createEmptyProfile());
    setStatus("Profile deleted.");
  };

  const handleCvUpload = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setCvResult(null);
    setCvDraft(null);
    setCvImportOpen(true);
    setCvStatus("Extracting text from the PDF...");

    try {
      const result = await extractPdfText(file);
      setCvResult(result);
      setCvDraft(parseCvText(result.text, result.links));
      setCvStatus("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read this PDF.";
      setCvStatus(message);
    }
  };

  const handleApplyCvDraft = () => {
    if (!cvDraft) {
      return;
    }

    const educationToAdd = cvDraft.education
      .filter((entry) => entry.institution && entry.degree)
      .map(({ rawText: _rawText, ...entry }) => ({ ...entry, id: crypto.randomUUID() }));
    const workExperienceToAdd = cvDraft.workExperience
      .filter((entry) => entry.company && entry.title)
      .map(({ rawText: _rawText, ...entry }) => ({ ...entry, id: crypto.randomUUID() }));

    setProfile((current) => {
      const personal = { ...current.personal };
      const personalKeys: Array<"fullName" | "email" | "phone" | "linkedin" | "github" | "portfolio"> = ["fullName", "email", "phone", "linkedin", "github", "portfolio"];

      for (const key of personalKeys) {
        const detectedValue = cvDraft.personal[key];
        if (detectedValue && !personal[key]) {
          personal[key] = detectedValue;
        }
      }

      return {
        ...current,
        personal: {
          ...personal,
          otherLinks: uniqueList([...current.personal.otherLinks, ...(cvDraft.personal.otherLinks ?? [])])
        },
        skills: uniqueList([...current.skills, ...cvDraft.skills]),
        languages: uniqueList([...current.languages, ...cvDraft.languages]),
        education: [...current.education, ...educationToAdd],
        workExperience: [...current.workExperience, ...workExperienceToAdd]
      };
    });
    setStatus("Detected fields added to the profile. Review them before saving. Incomplete entries remain available as candidates.");
    setCvImportOpen(false);
  };

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">notAgainPlease</p>
          <h1>Your profile</h1>
          <p className="intro">Add your information once and keep it available for future applications.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={handleDelete}>
            Delete profile
          </button>
          <button type="button" className="primary-button" onClick={handleSave}>
            Save profile
          </button>
        </div>
      </header>

      {status && <p className="status">{status}</p>}

      <section className="section-card">
        <h2>Personal information</h2>
        <div className="field-grid">
          <Field label="Full name" value={profile.personal.fullName} onChange={(value) => updatePersonal("fullName", value)} />
          <Field label="Email" value={profile.personal.email} onChange={(value) => updatePersonal("email", value)} type="email" />
          <Field label="Phone" value={profile.personal.phone} onChange={(value) => updatePersonal("phone", value)} type="tel" />
          <Field label="Location" value={profile.personal.location} onChange={(value) => updatePersonal("location", value)} />
          <Field label="LinkedIn" value={profile.personal.linkedin} onChange={(value) => updatePersonal("linkedin", value)} type="url" />
          <Field label="GitHub" value={profile.personal.github} onChange={(value) => updatePersonal("github", value)} type="url" />
          <Field label="Portfolio (Website)" value={profile.personal.portfolio} onChange={(value) => updatePersonal("portfolio", value)} type="url" />
          <label className="field">
            <span>Other links</span>
            <textarea value={profile.personal.otherLinks.join("\n")} onChange={(event) => setProfile((current) => ({ ...current, personal: { ...current.personal, otherLinks: splitList(event.target.value) } }))} rows={4} />
          </label>
        </div>
      </section>

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>CV import</h2>
            <p>Select a PDF to extract its text locally. The file is not uploaded or saved.</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => setCvImportOpen((current) => !current)}>
            {cvImportOpen ? "Hide CV import" : "Import CV"}
          </button>
        </div>
        {cvImportOpen && <>
          <label className="file-picker">
            <span>Choose CV PDF</span>
            <input type="file" accept="application/pdf,.pdf" onChange={(event) => handleCvUpload(event.target.files?.[0])} />
          </label>
          {cvStatus && <p className="status error-status">{cvStatus}</p>}
        </>}
        {cvImportOpen && cvResult && (
          <div className="cv-result">
            <p className="cv-meta">{cvResult.fileName} - {cvResult.pageCount} page(s)</p>
            <label className="field">
              <span>Extracted text</span>
              <textarea value={cvResult.text} readOnly rows={14} />
            </label>
            {cvDraft && (
              <div className="cv-draft">
                <div className="section-header">
                  <div>
                    <h3>Detected information</h3>
                    <p>Only simple, recognizable fields will be applied automatically.</p>
                  </div>
                  <button type="button" className="secondary-button" onClick={handleApplyCvDraft}>
                    Apply detected fields
                  </button>
                </div>
                <div className="detected-fields">
                  {Object.entries(cvDraft.personal).map(([key, value]) => (
                    <p key={key}><strong>{key}:</strong> {Array.isArray(value) ? value.join(", ") : value}</p>
                  ))}
                </div>
                <div className="field-grid">
                  <DraftList label="Skills" values={cvDraft.skills} />
                  <DraftList label="Languages" values={cvDraft.languages} />
                  <DraftEntryList label="Education candidates" entries={cvDraft.education} type="education" />
                  <DraftEntryList label="Work experience candidates" entries={cvDraft.workExperience} type="work" />
                </div>
                {Object.keys(cvDraft.otherSections).length > 0 && (
                  <div className="other-sections">
                    <h4>Other sections</h4>
                    {Object.entries(cvDraft.otherSections).map(([label, values]) => (
                      <DraftList key={label} label={label} values={values} />
                    ))}
                  </div>
                )}
                {cvDraft.warnings.map((warning) => <p className="draft-warning" key={warning}>{warning}</p>)}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>Education</h2>
            <p>Add degrees, courses, or other relevant education.</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => setProfile((current) => ({ ...current, education: [...current.education, createEmptyEducation()] }))}>
            Add education
          </button>
        </div>
        {profile.education.map((education) => (
          <EducationEditor
            key={education.id}
            education={education}
            onChange={(updated) => setProfile((current) => ({ ...current, education: current.education.map((item) => item.id === updated.id ? updated : item) }))}
            onRemove={() => setProfile((current) => ({ ...current, education: current.education.filter((item) => item.id !== education.id) }))}
          />
        ))}
      </section>

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>Work experience</h2>
            <p>Add your most relevant roles and responsibilities.</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => setProfile((current) => ({ ...current, workExperience: [...current.workExperience, createEmptyWorkExperience()] }))}>
            Add experience
          </button>
        </div>
        {profile.workExperience.map((experience) => (
          <WorkExperienceEditor
            key={experience.id}
            experience={experience}
            onChange={(updated) => setProfile((current) => ({ ...current, workExperience: current.workExperience.map((item) => item.id === updated.id ? updated : item) }))}
            onRemove={() => setProfile((current) => ({ ...current, workExperience: current.workExperience.filter((item) => item.id !== experience.id) }))}
          />
        ))}
      </section>

      <section className="section-card">
        <h2>Other information</h2>
        <p>Use one item per line.</p>
        <div className="field-grid">
          <label className="field">
            <span>Skills</span>
            <textarea value={profile.skills.join("\n")} onChange={(event) => updateList("skills", event.target.value)} rows={5} />
          </label>
          <label className="field">
            <span>Languages</span>
            <textarea value={profile.languages.join("\n")} onChange={(event) => updateList("languages", event.target.value)} rows={5} />
          </label>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Options />
  </StrictMode>
);
