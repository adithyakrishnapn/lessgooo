export const profiles = [
  {
    id: 'vlogger',
    name: 'Adi Vlogs',
    age: 21,
    verified: true,
    distance: '0.5 km away',
    subDistance: 'Probably editing a video right outside',
    image: '/vlogger.jpeg',
    bio: 'Hey guys, welcome back to my channel! Today we are swiping right on high-value matches. Just a casual tech/lifestyle content creator looking for a co-star for my next viral reel.',
    pros: [
      'Will color-grade your photos',
      'Cinematic 4K drone shots on our next date',
      'Knows how to handle a camera'
    ],
    cons: [
      'Will randomly pause our conversation to look into a camera lens that isn\'t there and say, "Don\'t forget to like and subscribe."'
    ],
    whatsappText: (dob, vibe) => 
      `Hey Adi Vlogs, I'm ready to collab! Our alignment (DOB: ${dob}) is perfect for a "${vibe}" co-starred video.`,
    rejectionText: 'Error 404: High-Value Match Missed. Are you sure you want to unsubscribe from this channel? Smash that Reconsider button!',
    whatsappNumber: '919876543210'
  },
  {
    id: 'romeo',
    name: 'Romeo Adi',
    age: 21,
    verified: true,
    distance: '0.1 km away',
    subDistance: 'Status: Madly in love | Heart Rate: 140 bpm',
    image: '/romeo.jpeg',
    bio: 'Are you a magician? Because whenever I look at you, everyone else disappears. Looking for someone who can handle intense eye contact, romantic sunset walks, and endless flirting. My love language is writing cheesy poetry about your smile.',
    pros: [
      'Will write handwritten love letters',
      'Knows how to cook your favorite food',
      'Has a master\'s degree in compliments'
    ],
    cons: [
      'Might stare at you for too long',
      'Calls you "my queen" in public',
      'Gets jealous of your phone when you look at it'
    ],
    whatsappText: (dob, vibe) => 
      `Hey Romeo Adi, I'm ready to let you write a poem for me on ${dob}. Let's match vibes ("${vibe}")!`,
    rejectionText: 'Romeo\'s heart has officially shattered into a million pieces. Are you sure you want to end this love story before it even begins?',
    whatsappNumber: '919876543210'
  },
  {
    id: 'comedian',
    name: 'Comedian Adi',
    age: 22,
    verified: true,
    distance: '2.5 km away',
    subDistance: 'Giggles/min: 45 | Vibe: Stand-up Ready',
    image: '/comedian.jpeg',
    bio: 'Looking for a co-conspirator to laugh at my terrible puns. My ideal date is making fun of people at the mall or getting kicked out of a theater for laughing too loud. I can make you smile even when Mercury is in a mood.',
    pros: [
      'Infinite laugh guarantee',
      'Can turn any boring situation into a meme'
    ],
    cons: [
      'Will tell bad jokes during serious arguments',
      'Might use our arguments as stand-up material'
    ],
    whatsappText: (dob, vibe) => 
      `Hey Comedian Adi, I'm ready to laugh at your puns on ${dob}! My vibe is "${vibe}".`,
    rejectionText: 'Is this a joke? Because I\'m not laughing! You sure you want to swipe left on a lifetime of free comedy?',
    whatsappNumber: '919876543210'
  },
  {
    id: 'ooola',
    name: 'Ooolaaa Adi',
    age: 20,
    verified: false,
    distance: '0.0 km away',
    subDistance: 'IQ Level: 4 | Status: Confused',
    image: '/ooola.jpeg',
    bio: 'Ooolaaa! Brain cells: 2. One is sleeping, the other is eating pizza. I forgot why I opened this app, but you look very pretty. I am excellent at making mistakes, breathing, and looking confused in public. Let\'s do nothing together.',
    pros: [
      'Will agree with everything you say because he doesn\'t understand it anyway',
      'Extremely low maintenance'
    ],
    cons: [
      'Might get lost in a straight hallway',
      'Will probably try to eat the phone screen',
      'Forgets his own age'
    ],
    whatsappText: (dob, vibe) => 
      `Ooolaaa Adi! Let's do absolutely nothing together on ${dob}! Vibe status: "${vibe}".`,
    rejectionText: 'Ooolaaa is very confused... did you click the wrong button? Please click Reconsider before he tries to eat a crayon!',
    whatsappNumber: '919876543210'
  },
  {
    id: 'magician',
    name: 'Magician Adi',
    age: 22,
    verified: true,
    distance: 'Hovering in mid-air',
    subDistance: 'Mana: 999 | Status: Spellcasting',
    image: '/magician.jpeg',
    bio: 'I can make your single status disappear. My hobbies include pulling rabbits out of hats, pretending to saw people in half, and casting spells to make you fall in love. Stare into my eyes and let me hypnotize your heart.',
    pros: [
      'Can magically make your bills disappear',
      'Knows awesome card tricks'
    ],
    cons: [
      'Might accidentally turn your pet into a pigeon',
      'Refuses to explain his tricks',
      'Lives in a cape'
    ],
    whatsappText: (dob, vibe) => 
      `Hey Magician Adi, cast your spell on me on ${dob}! Vibe level: "${vibe}".`,
    rejectionText: 'Alakazam! Your match has vanished! Stare at the crystal ball and click Reconsider to reverse the spell!',
    whatsappNumber: '919876543210'
  }
];
