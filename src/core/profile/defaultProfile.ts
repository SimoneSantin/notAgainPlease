import type { DatePrecision, Education, PersonalInfo, Profile, ProfileDate, WorkExperience } from "./types";

export const emptyPersonalInfo: PersonalInfo = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  portfolio: "",
  otherLinks: []
};

export function createEmptyProfileDate(precision: DatePrecision = "month"): ProfileDate {
  return { value: "", precision };
}

export function createEmptyEducation(): Education {
  return {
    id: crypto.randomUUID(),
    institution: "",
    degree: "",
    fieldOfStudy: "",
    gpa: "",
    finalGrade: "",
    startDate: createEmptyProfileDate(),
    endDate: createEmptyProfileDate(),
    description: ""
  };
}

export function createEmptyWorkExperience(): WorkExperience {
  return {
    id: crypto.randomUUID(),
    company: "",
    title: "",
    location: "",
    startDate: createEmptyProfileDate(),
    endDate: createEmptyProfileDate(),
    description: ""
  };
}

export function createEmptyProfile(): Profile {
  return {
    personal: { ...emptyPersonalInfo },
    education: [],
    workExperience: [],
    skills: [],
    languages: []
  };
}
