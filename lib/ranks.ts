export const RANKS = [
  { title: 'New Recruit',        min: 0    },
  { title: 'Tipster',            min: 1    },
  { title: 'Spotter',            min: 10   },
  { title: 'Lookout',            min: 25   },
  { title: 'Pavement Patroller', min: 50   },
  { title: 'Street Scout',       min: 100  },
  { title: 'Warden Whisperer',   min: 200  },
  { title: 'Parked Vigilante',   min: 500  },
  { title: 'High Road Guardian', min: 1000 },
  { title: 'Lookout Legend',     min: 2500 },
];

export function getRank(driversSaved: number): string {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (driversSaved >= RANKS[i].min) return RANKS[i].title;
  }
  return RANKS[0].title;
}

export function getNextRank(driversSaved: number): { title: string; needed: number } | null {
  for (let i = 0; i < RANKS.length; i++) {
    if (driversSaved < RANKS[i].min) {
      return { title: RANKS[i].title, needed: RANKS[i].min - driversSaved };
    }
  }
  return null; // already Lookout Legend
}
