export type PersonalInfo = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  otherLinks: string[];
};

export type DatePrecision = "day" | "month" | "year";

export type ProfileDate = {
  value: string;
  precision: DatePrecision;
};

export type Education = {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  gpa: string;
  finalGrade: string;
  startDate: ProfileDate;
  endDate: ProfileDate;
  description: string;
};

export type WorkExperience = {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: ProfileDate;
  endDate: ProfileDate;
  description: string;
};

export type Profile = {
  personal: PersonalInfo;
  education: Education[];
  workExperience: WorkExperience[];
  skills: string[];
  languages: string[];
};
