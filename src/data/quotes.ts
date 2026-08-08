export interface Quote {
  quote: string;
  author: string;
}

// Seeded pseudo-random number generator (Mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically picks `count` quotes for today.
 * Same quotes all day, different ones tomorrow.
 */
export function getDailyQuotes(count = 5): Quote[] {
  const today = new Date().toISOString().split('T')[0]; // "2026-07-17"
  const seed = today.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = mulberry32(seed);

  // Fisher-Yates shuffle using seeded random
  const shuffled = [...QUOTES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export const QUOTES: Quote[] = [
  {
    quote: 'Discipline is the bridge between goals and accomplishment.',
    author: 'Jim Rohn',
  },
  {
    quote: 'The secret of getting ahead is getting started.',
    author: 'Mark Twain',
  },
  {
    quote: 'Small daily improvements over time lead to stunning results.',
    author: 'Robin Sharma',
  },
  {
    quote: "You don't have to be extreme, just consistent.",
    author: 'Unknown',
  },
  {
    quote: 'Success is the sum of small efforts repeated day in and day out.',
    author: 'Robert Collier',
  },
  {
    quote: 'Motivation gets you started. Habit keeps you going.',
    author: 'Jim Ryun',
  },
  {
    quote: 'The chains of habit are too weak to be felt until they are too strong to be broken.',
    author: 'Samuel Johnson',
  },
  {
    quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
    author: 'Aristotle',
  },
  {
    quote: 'First we make our habits, then our habits make us.',
    author: 'Charles C. Noble',
  },
  {
    quote: "The harder you work for something, the greater you'll feel when you achieve it.",
    author: 'Unknown',
  },
  {
    quote: 'It does not matter how slowly you go as long as you do not stop.',
    author: 'Confucius',
  },
  {
    quote: "Believe you can and you're halfway there.",
    author: 'Theodore Roosevelt',
  },
  {
    quote: 'Your habits shape your future more than your goals.',
    author: 'James Clear',
  },
  {
    quote: 'Every action you take is a vote for the type of person you wish to become.',
    author: 'James Clear',
  },
  {
    quote: 'The best time to plant a tree was 20 years ago. The second best time is now.',
    author: 'Chinese Proverb',
  },
  {
    quote: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
    author: 'Winston Churchill',
  },
  {
    quote: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
  },
  {
    quote: "Don't watch the clock; do what it does. Keep going.",
    author: 'Sam Levenson',
  },
  {
    quote: 'The secret of your future is hidden in your daily routine.',
    author: 'Mike Murdock',
  },
  {
    quote: 'Act as if what you do makes a difference. It does.',
    author: 'William James',
  },
  {
    quote: 'What you get by achieving your goals is not as important as what you become.',
    author: 'Zig Ziglar',
  },
  {
    quote: 'The only person you are destined to become is the person you decide to be.',
    author: 'Ralph Waldo Emerson',
  },
  {
    quote: 'In the middle of every difficulty lies opportunity.',
    author: 'Albert Einstein',
  },
  {
    quote: 'Do what you can, with what you have, where you are.',
    author: 'Theodore Roosevelt',
  },
  {
    quote: "It always seems impossible until it's done.",
    author: 'Nelson Mandela',
  },
  {
    quote: "Whether you think you can or you think you can't, you're right.",
    author: 'Henry Ford',
  },
  {
    quote: 'The future belongs to those who believe in the beauty of their dreams.',
    author: 'Eleanor Roosevelt',
  },
  {
    quote: "Don't count the days, make the days count.",
    author: 'Muhammad Ali',
  },
  {
    quote: 'The best way to predict the future is to create it.',
    author: 'Peter Drucker',
  },
  {
    quote: "You miss 100% of the shots you don't take.",
    author: 'Wayne Gretzky',
  },
  {
    quote: 'Be the change that you wish to see in the world.',
    author: 'Mahatma Gandhi',
  },
  {
    quote: 'Start where you are. Use what you have. Do what you can.',
    author: 'Arthur Ashe',
  },
  {
    quote: 'Happiness is not something ready made. It comes from your own actions.',
    author: 'Dalai Lama',
  },
  {
    quote: 'Push yourself, because no one else is going to do it for you.',
    author: 'Unknown',
  },
  {
    quote: 'The only limit to our realization of tomorrow is our doubts of today.',
    author: 'Franklin D. Roosevelt',
  },
  {
    quote: 'Great things never come from comfort zones.',
    author: 'Unknown',
  },
  {
    quote: 'Dream big. Start small. Act now.',
    author: 'Robin Sharma',
  },
  {
    quote: 'Success usually comes to those who are too busy to be looking for it.',
    author: 'Henry David Thoreau',
  },
  {
    quote: 'The way to get started is to quit talking and begin doing.',
    author: 'Walt Disney',
  },
  {
    quote: "Don't let yesterday take up too much of today.",
    author: 'Will Rogers',
  },
  {
    quote: 'You are never too old to set another goal or to dream a new dream.',
    author: 'C.S. Lewis',
  },
  {
    quote: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.',
    author: 'Ralph Waldo Emerson',
  },
  {
    quote: 'Perfection is not attainable, but if we chase perfection we can catch excellence.',
    author: 'Vince Lombardi',
  },
  {
    quote: 'A year from now you may wish you had started today.',
    author: 'Karen Lamb',
  },
  {
    quote: 'The only impossible journey is the one you never begin.',
    author: 'Tony Robbins',
  },
  {
    quote: "Everything you've ever wanted is on the other side of fear.",
    author: 'George Addair',
  },
  {
    quote: 'Success is not how high you have climbed, but how you make a positive difference to the world.',
    author: 'Roy T. Bennett',
  },
  {
    quote: 'Fall seven times, stand up eight.',
    author: 'Japanese Proverb',
  },
  {
    quote: 'The biggest adventure you can take is to live the life of your dreams.',
    author: 'Oprah Winfrey',
  },
  {
    quote: "Your time is limited, don't waste it living someone else's life.",
    author: 'Steve Jobs',
  },
  {
    quote: 'If you want to lift yourself up, lift up someone else.',
    author: 'Booker T. Washington',
  },
  {
    quote: 'Habits are the compound interest of self-improvement.',
    author: 'James Clear',
  },
  {
    quote: 'The greatest glory in living lies not in never falling, but in rising every time we fall.',
    author: 'Nelson Mandela',
  },
  {
    quote: 'Stay hungry, stay foolish.',
    author: 'Steve Jobs',
  },
  {
    quote: 'If you can dream it, you can do it.',
    author: 'Walt Disney',
  },
  {
    quote: 'Be not afraid of going slowly, be afraid only of standing still.',
    author: 'Chinese Proverb',
  },
];
