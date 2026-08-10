// Curated local quotes, bucketed by time of day, no external API.
// One is chosen at random per intro screen render.
const QUOTES = {
  morning: [
    'Let the morning arrive slowly — there is no need to rush toward the day.',
    'Before the noise starts, notice the quiet you’re still standing in.',
    'A new page. You don’t have to know yet what goes on it.',
    'The light is doing something today. Give it a minute of your attention.',
    'Whatever yesterday was, it isn’t asking anything of you now.',
    'Start slow. The day will meet you at whatever pace you bring to it.',
    'You don’t need a plan for the whole day — just the next small thing.',
    'Something in you is already awake before you are. Trust it.',
    'The morning doesn’t need to be productive to be worth having.',
    'However you woke up feeling, that’s allowed to be the whole truth for now.',
    'Coffee, quiet, the window open — some mornings ask for nothing more.',
    'Let today surprise you a little. You don’t have to have it figured out yet.',
    'The world resets a little every morning. So can you.',
    'Take the first hour slowly. It sets the tone for the rest.',
  ],
  noon: [
    'Somewhere in the middle of the day, remember to breathe.',
    'Halfway through — however it’s gone so far, it’s allowed to change.',
    'A pause now costs you nothing and might save the afternoon.',
    'Whatever you’re carrying, you can set it down for a minute.',
    'The middle of the day rarely gets noticed. Notice it anyway.',
    'You don’t have to finish everything today to call it a good one.',
    'Eat something. Look up. The rest can wait ninety seconds.',
    'If the morning went sideways, the afternoon doesn’t know that yet.',
    'Small resets count. This can be one of them.',
    'You’re allowed to want less from the rest of today than you planned.',
    'Whatever’s next on the list, it can wait for one more breath first.',
    'The middle of things is usually where it feels hardest. That’s normal.',
    'Not every hour needs to be accounted for. This one can just pass.',
  ],
  evening: [
    'Let the day settle. Tomorrow will still be there in the morning.',
    'Whatever didn’t get done can wait for a version of you that’s rested.',
    'The day is closing whether or not you feel finished with it.',
    'Something happened today worth remembering, even if it was small.',
    'You carried today as best you could. That’s enough for tonight.',
    'Let your shoulders come down from wherever they’ve been all day.',
    'The evening doesn’t ask you to have answers, only to rest.',
    'However today went, it’s allowed to just be over now.',
    'Say what today was, even just to yourself. That’s what this is for.',
    'Tomorrow can hold what today couldn’t. Let it.',
    'The quiet at the end of the day is doing you some good, even now.',
    'You don’t owe tonight any more effort than it takes to rest.',
    'Whatever stayed with you today, it’s safe to put into words here.',
    'One day, however it went, is just one day.',
  ],
}

export function getRandomQuote(timeKey) {
  const bucket = QUOTES[timeKey] ?? QUOTES.morning
  return bucket[Math.floor(Math.random() * bucket.length)]
}
