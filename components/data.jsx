// Mock data for Naratala HRIS

const EMPLOYEES = [
  { id: 1,  name: 'Amelia Hartwell',  role: 'Senior Product Designer', dept: 'Design', location: 'Brooklyn, NY',   start: '2021-03-14', status: 'Active', email: 'amelia.h@naratala.co',  phone: '+1 (718) 555-0142', salary: 142000, manager: 'Rosa Chen',    avatar: 'AH', hue: 24,  pronouns: 'she/her' },
  { id: 2,  name: 'Kenji Mori',        role: 'Staff Engineer',          dept: 'Engineering', location: 'Austin, TX',     start: '2019-08-02', status: 'Active', email: 'kenji.m@naratala.co',   phone: '+1 (512) 555-0198', salary: 186000, manager: 'Priya Shah',   avatar: 'KM', hue: 150, pronouns: 'he/him' },
  { id: 3,  name: 'Rosa Chen',         role: 'Head of Design',          dept: 'Design', location: 'San Francisco',   start: '2018-01-22', status: 'Active', email: 'rosa.c@naratala.co',    phone: '+1 (415) 555-0166', salary: 215000, manager: 'Theo Laurent', avatar: 'RC', hue: 320, pronouns: 'she/her' },
  { id: 4,  name: 'Jamal Okafor',      role: 'Recruiter',               dept: 'People', location: 'Remote — ATL',    start: '2022-11-07', status: 'Active', email: 'jamal.o@naratala.co',   phone: '+1 (404) 555-0133', salary: 94000,  manager: 'Lea Varga',    avatar: 'JO', hue: 60,  pronouns: 'he/him' },
  { id: 5,  name: 'Priya Shah',        role: 'VP Engineering',          dept: 'Engineering', location: 'London, UK',  start: '2017-05-19', status: 'Active', email: 'priya.s@naratala.co',   phone: '+44 20 7946 0421',  salary: 248000, manager: 'Theo Laurent', avatar: 'PS', hue: 200, pronouns: 'she/her' },
  { id: 6,  name: 'Theo Laurent',      role: 'Chief People Officer',    dept: 'Executive', location: 'San Francisco', start: '2016-09-01', status: 'Active', email: 'theo.l@naratala.co',    phone: '+1 (415) 555-0177', salary: 310000, manager: '—',            avatar: 'TL', hue: 280, pronouns: 'he/him' },
  { id: 7,  name: 'Mina Abiodun',      role: 'Accountant',              dept: 'Finance', location: 'Remote — LAG',   start: '2023-02-14', status: 'Active', email: 'mina.a@naratala.co',    phone: '+234 80 555 0122',  salary: 82000,  manager: 'Daniel Voss',  avatar: 'MA', hue: 12,  pronouns: 'she/her' },
  { id: 8,  name: 'Daniel Voss',       role: 'Finance Director',        dept: 'Finance', location: 'New York, NY',   start: '2019-06-10', status: 'Active', email: 'daniel.v@naratala.co',  phone: '+1 (212) 555-0188', salary: 195000, manager: 'Theo Laurent', avatar: 'DV', hue: 100, pronouns: 'he/him' },
  { id: 9,  name: 'Lea Varga',         role: 'People Ops Lead',         dept: 'People', location: 'Budapest',         start: '2020-04-03', status: 'Active', email: 'lea.v@naratala.co',     phone: '+36 1 555 0144',    salary: 118000, manager: 'Theo Laurent', avatar: 'LV', hue: 340, pronouns: 'she/her' },
  { id: 10, name: 'Ishaan Kapoor',     role: 'Frontend Engineer',       dept: 'Engineering', location: 'Bangalore',    start: '2023-07-25', status: 'Active', email: 'ishaan.k@naratala.co',  phone: '+91 80 555 0119',   salary: 98000,  manager: 'Kenji Mori',   avatar: 'IK', hue: 180, pronouns: 'he/him' },
  { id: 11, name: 'Sofia Reyes',       role: 'Product Manager',         dept: 'Product', location: 'Mexico City',     start: '2021-10-18', status: 'Active', email: 'sofia.r@naratala.co',   phone: '+52 55 5555 0166',  salary: 138000, manager: 'Theo Laurent', avatar: 'SR', hue: 40,  pronouns: 'she/her' },
  { id: 12, name: 'Marcus Okoye',      role: 'Customer Success',        dept: 'Success', location: 'Remote — LDN',    start: '2024-01-08', status: 'On leave', email: 'marcus.o@naratala.co', phone: '+44 20 7946 0455',  salary: 76000,  manager: 'Lea Varga',    avatar: 'MO', hue: 220, pronouns: 'he/him' },
  { id: 13, name: 'Elena Dvorak',      role: 'Data Analyst',            dept: 'Finance', location: 'Prague',           start: '2022-08-29', status: 'Active', email: 'elena.d@naratala.co',   phone: '+420 234 555 0144', salary: 89000,  manager: 'Daniel Voss',  avatar: 'ED', hue: 300, pronouns: 'she/her' },
  { id: 14, name: 'Omar Haddad',       role: 'DevOps Engineer',         dept: 'Engineering', location: 'Dubai',       start: '2020-11-11', status: 'Active', email: 'omar.h@naratala.co',    phone: '+971 4 555 0177',   salary: 132000, manager: 'Kenji Mori',   avatar: 'OH', hue: 90,  pronouns: 'he/him' },
  { id: 15, name: 'Yuki Tanaka',       role: 'Brand Designer',          dept: 'Design', location: 'Tokyo',            start: '2024-03-04', status: 'Active', email: 'yuki.t@naratala.co',    phone: '+81 3 5555 0199',   salary: 104000, manager: 'Rosa Chen',    avatar: 'YT', hue: 0,   pronouns: 'they/them' },
];

const ABSENCE_REQUESTS = [
  { id: 'a1', empId: 1,  type: 'Vacation',       days: 5, from: 'May 5',  to: 'May 9',  reason: 'Family wedding in Ontario', submitted: '2 hours ago',  coverage: 'Yuki T.',  status: 'pending', urgent: true },
  { id: 'a2', empId: 10, type: 'Sick leave',     days: 1, from: 'Today',  to: 'Today',  reason: 'Migraine, will rest today', submitted: '40 minutes ago', coverage: '—',        status: 'pending', urgent: true },
  { id: 'a3', empId: 7,  type: 'Personal',       days: 2, from: 'May 12', to: 'May 13', reason: 'Moving apartments',         submitted: 'Yesterday',      coverage: 'Elena D.', status: 'pending' },
  { id: 'a4', empId: 14, type: 'Vacation',       days: 10, from: 'Jun 2', to: 'Jun 13', reason: 'Eid visit with family',     submitted: 'Yesterday',      coverage: 'Ishaan K.',status: 'pending' },
  { id: 'a5', empId: 4,  type: 'Bereavement',    days: 3, from: 'Apr 22', to: 'Apr 24', reason: '—',                          submitted: '2 days ago',     coverage: 'Lea V.',   status: 'pending', urgent: true },
  { id: 'a6', empId: 11, type: 'Parental leave', days: 60, from: 'Jul 1', to: 'Aug 29', reason: 'Welcoming baby #2',          submitted: '3 days ago',     coverage: 'Sofia R.', status: 'pending' },
  { id: 'a7', empId: 13, type: 'Vacation',       days: 4, from: 'May 19', to: 'May 22', reason: 'Hiking Tatras',              submitted: '3 days ago',     coverage: 'Mina A.',  status: 'pending' },
  { id: 'a8', empId: 15, type: 'Sick leave',     days: 1, from: 'Apr 21', to: 'Apr 21', reason: 'Dentist',                    submitted: '4 days ago',     coverage: '—',        status: 'approved' },
];

const CALENDAR_ABSENCES = [
  { empId: 12, type: 'Parental',  days: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30] },
  { empId: 8,  type: 'Vacation',  days: [7,8,9,10,11] },
  { empId: 3,  type: 'Vacation',  days: [14,15,16] },
  { empId: 6,  type: 'Conference', days: [21,22,23] },
  { empId: 2,  type: 'Vacation',  days: [24,25,26,27,28] },
];

const DEPARTMENTS = ['All', 'Design', 'Engineering', 'People', 'Finance', 'Product', 'Success', 'Executive'];

const PAYROLL_MONTHS = [
  { m: 'Nov', total: 412000, headcount: 54 },
  { m: 'Dec', total: 418000, headcount: 55 },
  { m: 'Jan', total: 431000, headcount: 57 },
  { m: 'Feb', total: 438000, headcount: 58 },
  { m: 'Mar', total: 447000, headcount: 60 },
  { m: 'Apr', total: 462000, headcount: 62 },
];

const BENEFITS = [
  { id: 'b1', name: 'Medical — PPO Gold',   carrier: 'Aetna',      enrolled: 51, eligible: 62, cost: '$612/mo', coverage: 'EE + Family' },
  { id: 'b2', name: 'Dental — Premium',     carrier: 'Delta',      enrolled: 58, eligible: 62, cost: '$42/mo',  coverage: 'EE + Family' },
  { id: 'b3', name: 'Vision',               carrier: 'VSP',        enrolled: 49, eligible: 62, cost: '$14/mo',  coverage: 'EE + Family' },
  { id: 'b4', name: '401(k) Match — 5%',    carrier: 'Fidelity',   enrolled: 54, eligible: 62, cost: 'Match',   coverage: 'All FT' },
  { id: 'b5', name: 'Learning stipend',     carrier: 'Internal',   enrolled: 62, eligible: 62, cost: '$1,500/yr', coverage: 'All FT' },
  { id: 'b6', name: 'Wellness — ClassPass', carrier: 'ClassPass',  enrolled: 38, eligible: 62, cost: '$79/mo',  coverage: 'EE only' },
];

const COMP_BANDS = [
  { level: 'L2 · Associate',   min: 72,  mid: 85,  max: 98,  count: 6  },
  { level: 'L3 · Mid',         min: 92,  mid: 110, max: 128, count: 14 },
  { level: 'L4 · Senior',      min: 125, mid: 148, max: 171, count: 18 },
  { level: 'L5 · Staff',       min: 165, mid: 192, max: 219, count: 9  },
  { level: 'L6 · Principal',   min: 205, mid: 238, max: 271, count: 4  },
  { level: 'L7 · Director',    min: 240, mid: 278, max: 316, count: 3  },
  { level: 'L8 · VP',          min: 285, mid: 320, max: 355, count: 2  },
];

const JOBS = [
  { id: 'j1', title: 'Senior iOS Engineer',        dept: 'Engineering', location: 'Remote — Americas', type: 'Full-time', stage: { applied: 47, screen: 8, interview: 4, offer: 1 }, opened: '12 days ago', owner: 'Jamal O.' },
  { id: 'j2', title: 'Product Designer',           dept: 'Design',      location: 'San Francisco',     type: 'Full-time', stage: { applied: 112, screen: 21, interview: 9, offer: 2 }, opened: '21 days ago', owner: 'Jamal O.' },
  { id: 'j3', title: 'People Ops Coordinator',     dept: 'People',      location: 'Remote — EMEA',     type: 'Full-time', stage: { applied: 68, screen: 12, interview: 3, offer: 0 }, opened: '6 days ago',  owner: 'Lea V.' },
  { id: 'j4', title: 'Customer Success Associate', dept: 'Success',     location: 'London, UK',        type: 'Full-time', stage: { applied: 34, screen: 6, interview: 2, offer: 0 }, opened: '4 days ago', owner: 'Jamal O.' },
  { id: 'j5', title: 'Data Engineer (Contract)',   dept: 'Engineering', location: 'Remote',            type: 'Contract',  stage: { applied: 23, screen: 4, interview: 1, offer: 1 }, opened: '18 days ago', owner: 'Kenji M.' },
];

const ACTIVITY = [
  { when: 'just now',      who: 'Lea Varga',      what: 'approved an expense report',    tag: 'Finance' },
  { when: '12 min ago',    who: 'Jamal Okafor',   what: 'moved Priya N. to Onsite round', tag: 'Recruiting' },
  { when: '1 hr ago',      who: 'Payroll bot',    what: 'ran April preview — $462,310',  tag: 'Payroll' },
  { when: '3 hrs ago',     who: 'Rosa Chen',      what: 'completed Q2 review for 4 reports', tag: 'Reviews' },
  { when: 'yesterday',     who: 'Theo Laurent',   what: 'published the updated parental leave policy', tag: 'Policy' },
];

Object.assign(window, {
  EMPLOYEES, ABSENCE_REQUESTS, CALENDAR_ABSENCES, DEPARTMENTS,
  PAYROLL_MONTHS, BENEFITS, COMP_BANDS, JOBS, ACTIVITY
});
