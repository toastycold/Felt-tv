// Things to draw. Concrete and a little silly works best.
export const WORDS = `
birthday cake|snowman|haunted house|roller coaster|astronaut|lighthouse|dragon|sandcastle|pirate ship|campfire
volcano|tornado|mermaid|robot dog|jellyfish|hot air balloon|skateboard|treehouse|unicorn|vampire|scarecrow
waterfall|igloo|cactus|giraffe|penguin|octopus|butterfly|spider web|rainbow|thunderstorm|alien|time machine
superhero|wizard|knight|castle|dinosaur|shark attack|bubble bath|sleepwalking|brain freeze|traffic jam
magic trick|lawn mower|toothbrush|ice skating|fishing|bowling|surfing|camping|selfie|pizza party|sunburn
haircut|yoga|parachute|lost sock|alarm clock|bookworm|couch potato|night owl|piggy bank|mailbox|lemonade stand
garden gnome|tightrope|marching band|treasure map|crystal ball|baby shower|car wash|stage fright|road trip
`.trim().split(/\|+|\n+/).map((w) => w.trim()).filter(Boolean);
