// Things to draw. Concrete and a little silly works best.
export const WORDS = `
birthday cake|snowman|haunted house|roller coaster|astronaut|lighthouse|dragon|sandcastle|pirate ship|campfire
volcano|tornado|mermaid|robot dog|jellyfish|hot air balloon|skateboard|treehouse|unicorn|vampire|scarecrow
waterfall|igloo|cactus|giraffe|penguin|octopus|butterfly|spider web|rainbow|thunderstorm|alien|time machine
superhero|wizard|knight|castle|dinosaur|shark attack|bubble bath|sleepwalking|brain freeze|traffic jam
magic trick|lawn mower|toothbrush|ice skating|fishing|bowling|surfing|camping|selfie|pizza party|sunburn
haircut|yoga|parachute|lost sock|alarm clock|bookworm|couch potato|night owl|piggy bank|mailbox|lemonade stand
garden gnome|tightrope|marching band|treasure map|crystal ball|baby shower|car wash|stage fright|road trip
grilled cheese|pancake stack|spaghetti|taco tuesday|popcorn|ice cream truck|food fight|cupcake|watermelon|pizza delivery|corn dog|gingerbread house
burnt toast|cotton candy|banana peel|hot sauce|soup kitchen|picnic|lunch lady|milkshake|cereal box|jelly bean|fortune cookie|corn maze
dentist|firefighter|lifeguard|mad scientist|magician|ninja|cowboy|knight|chef|zookeeper|mime|superhero|wizard|referee|mail carrier|weatherman
grandma|babysitter|tooth fairy|Santa Claus|Easter bunny|leprechaun|ghost|zombie|mummy|werewolf|genie|fairy godmother|sea monster|bigfoot
kangaroo|sloth|flamingo|hedgehog|llama|porcupine|shark attack|goldfish|raccoon|skunk|walrus|polar bear|peacock|chameleon|bat cave|beehive
lawn mower|vacuum|toaster|trampoline|bunk beds|bubble bath|blanket fort|fire drill|remote control|selfie stick|video game|board game night
traffic jam|flat tire|school bus|ferris wheel|bumper cars|water slide|zip line|submarine|helicopter|tractor|train station|elevator|escalator
snow day|sunburn|hailstorm|full moon|shooting star|solar eclipse|earthquake|fog|tidal wave|desert island|quicksand|avalanche|northern lights
first day of school|spelling bee|science fair|detention|pop quiz|recess|graduation|field trip|lost and found|homework|school play|show and tell
wedding|family reunion|surprise party|sleepover|pajama party|garage sale|bake sale|talent show|camping trip|fishing|hide and seek|tag
sneeze|hiccups|brain freeze|bad hair day|daydream|nightmare|sleepwalking|tickle fight|belly flop|cannonball|high five|group hug|stubbed toe
toilet paper|rubber duck|teddy bear|sock puppet|kite|yo-yo|jack in the box|snow globe|lava lamp|disco ball|treasure chest|magic carpet
king of the hill|tug of war|piñata|limbo|karaoke|air guitar|ballet|break dance|bowling|golf|soccer|basketball|surfing|skiing|sledding|ice skating
Mount Rushmore|the Eiffel Tower|pyramids|Statue of Liberty|Great Wall|castle|haunted mansion|barn|lighthouse keeper|outhouse|tree swing
`.trim().split(/\|+|\n+/).map((w) => w.trim()).filter(Boolean)
  .filter((w, i, all) => all.findIndex((x) => x.toLowerCase() === w.toLowerCase()) === i);   // no repeats
