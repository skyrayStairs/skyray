// Structural index of published subclasses — Player's Handbook (both rulesets), plus Xanathar's
// Guide to Everything and Tasha's Cauldron of Everything for 2014. Name, feature names, and the
// levels they arrive at.
//
// None of the books' prose appears here. Rules and mechanics are not copyrightable — only the
// sentences describing them are — so a `body` states the rule in plain words and nothing more. What
// makes that safe in bulk is provenance: bodies are written from text the owner of the book supplies
// and can check, one subclass at a time, never generated wholesale from recall.
//
// ACCURACY: unlike src/lib/assets/data/dnd/classes/**, this is NOT generated from a source document,
// so nothing can verify the names against a book. tests/subclassIndex.spec.ts cross-checks the
// twelve SRD subclasses against the generated SRD data — that already caught two wrong entries and
// one parser bug — but it can say nothing about the rest, and nothing at all about the expansion
// books, which have no SRD. Treat every unverified entry as a draft: proofread against your own
// copy and correct what's wrong. Every entry is editable in the app.

import type { ClassVersion } from '$lib/types/dndClass'

export type SubclassOutline = {
	name: string
	features: {
		name: string
		levels: number[]
		/**
		 * The mechanical effect, restated. Optional: an entry with no body is a bare scaffold and the
		 * page says so. Rules and mechanics are not copyrightable — only the prose describing them is
		 * — so what belongs here is the rule in plain words, never the book's sentences. Filled in
		 * from a source the owner can check, one subclass at a time, rather than from recall.
		 */
		body?: string
		/** For features that are themselves a choice: Battle Master manoeuvres, Totem Spirit animals. */
		options?: { label: string; body: string }[]
	}[]
	/** Which book it comes from. Grouped by this in the picker so provenance is visible. */
	source?: string
}

/** slug -> subclasses, per ruleset. Includes the SRD subclass so the list reads as one whole set. */
export type SubclassIndex = Record<string, SubclassOutline[]>

const f = (name: string, ...levels: number[]) => ({ name, levels })

/** Every paladin oath grants its spells on the same 3/5/9/13/17 ladder, so only the spells vary. */
const OATH_SPELLS = (rows: string[]) =>
	[
		'Always prepared, and they do not count against the number of spells you can prepare.',
		'',
		'| Paladin Level | Spells |',
		'| --- | --- |',
		...['3rd', '5th', '9th', '13th', '17th'].map((lv, i) => `| ${lv} | ${rows[i]} |`)
	].join('\n')

export const SOURCES = {
	phb2014: "Player's Handbook",
	phb2024: "Player's Handbook",
	xgte: "Xanathar's Guide to Everything",
	tcoe: "Tasha's Cauldron of Everything"
} as const

export const SUBCLASSES_2014: SubclassIndex = {
	barbarian: [
		{
			name: 'Path of the Berserker',
			features: [
				f('Frenzy', 3),
				f('Mindless Rage', 6),
				f('Intimidating Presence', 10),
				f('Retaliation', 14)
			]
		},
		{
			name: 'Path of the Totem Warrior',
			features: [
				f('Spirit Seeker', 3),
				f('Totem Spirit', 3),
				f('Aspect of the Beast', 6),
				f('Spirit Walker', 10),
				f('Totemic Attunement', 14)
			]
		}
	],
	bard: [
		{
			name: 'College of Lore',
			features: [
				f('Bonus Proficiencies', 3),
				f('Cutting Words', 3),
				f('Additional Magical Secrets', 6),
				f('Peerless Skill', 14)
			]
		},
		{
			name: 'College of Valor',
			features: [
				f('Bonus Proficiencies', 3),
				f('Combat Inspiration', 3),
				f('Extra Attack', 6),
				f('Battle Magic', 14)
			]
		}
	],
	cleric: [
		{
			name: 'Knowledge Domain',
			features: [
				f('Bonus Proficiencies', 1),
				f('Blessings of Knowledge', 1),
				f('Channel Divinity: Knowledge of the Ages', 2),
				f('Channel Divinity: Read Thoughts', 6),
				f('Potent Spellcasting', 8),
				f('Visions of the Past', 17)
			]
		},
		{
			name: 'Life Domain',
			features: [
				f('Bonus Proficiency', 1),
				f('Disciple of Life', 1),
				f('Channel Divinity: Preserve Life', 2),
				f('Blessed Healer', 6),
				f('Divine Strike', 8),
				f('Supreme Healing', 17)
			]
		},
		{
			name: 'Light Domain',
			features: [
				f('Bonus Cantrip', 1),
				f('Warding Flare', 1),
				f('Channel Divinity: Radiance of the Dawn', 2),
				f('Improved Flare', 6),
				f('Potent Spellcasting', 8),
				f('Corona of Light', 17)
			]
		},
		{
			name: 'Nature Domain',
			features: [
				f('Acolyte of Nature', 1),
				f('Bonus Proficiency', 1),
				f('Channel Divinity: Charm Animals and Plants', 2),
				f('Dampen Elements', 6),
				f('Divine Strike', 8),
				f('Master of Nature', 17)
			]
		},
		{
			name: 'Tempest Domain',
			features: [
				f('Bonus Proficiencies', 1),
				f('Wrath of the Storm', 1),
				f('Channel Divinity: Destructive Wrath', 2),
				f('Thunderbolt Strike', 6),
				f('Divine Strike', 8),
				f('Stormborn', 17)
			]
		},
		{
			name: 'Trickery Domain',
			features: [
				f('Blessing of the Trickster', 1),
				f('Channel Divinity: Invoke Duplicity', 2),
				f('Channel Divinity: Cloak of Shadows', 6),
				f('Divine Strike', 8),
				f('Improved Duplicity', 17)
			]
		},
		{
			name: 'War Domain',
			features: [
				f('Bonus Proficiencies', 1),
				f('War Priest', 1),
				f('Channel Divinity: Guided Strike', 2),
				f("Channel Divinity: War God's Blessing", 6),
				f('Divine Strike', 8),
				f('Avatar of Battle', 17)
			]
		}
	],
	druid: [
		{
			name: 'Circle of the Land',
			features: [
				f('Bonus Cantrip', 2),
				f('Natural Recovery', 2),
				f('Circle Spells', 3),
				f("Land's Stride", 6),
				f("Nature's Ward", 10),
				f("Nature's Sanctuary", 14)
			]
		},
		{
			name: 'Circle of the Moon',
			features: [
				{
					name: 'Combat Wild Shape',
					levels: [2],
					body: [
						'Wild Shape as a **bonus action** rather than an action.',
						'',
						'While transformed, a **bonus action plus a spell slot** heals you **1d8 per level of the slot**.'
					].join('\n')
				},
				{
					// The table's "Circle Forms" row is level 2, but the feature explicitly improves at 6.
					name: 'Circle Forms',
					levels: [2, 6],
					body: [
						'Wild Shape into beasts of **challenge rating 1** or lower — you ignore the Max CR column of the Beast Shapes table but obey its other limits.',
						'',
						'From **6th level**, the cap becomes **your druid level divided by 3, rounded down**.'
					].join('\n')
				},
				{
					name: 'Primal Strike',
					levels: [6],
					body: 'Your attacks in beast form count as **magical** for overcoming resistance and immunity to nonmagical attacks and damage.'
				},
				{
					name: 'Elemental Wild Shape',
					levels: [10],
					body: 'Spend **two Wild Shape uses at once** to become an **air, earth, fire or water elemental**.'
				},
				{
					name: 'Thousand Forms',
					levels: [14],
					body: 'You can cast **Alter Self at will**.'
				}
			]
		}
	],
	fighter: [
		{
			name: 'Champion',
			features: [
				f('Improved Critical', 3),
				f('Remarkable Athlete', 7),
				f('Additional Fighting Style', 10),
				f('Superior Critical', 15),
				f('Survivor', 18)
			]
		},
		{
			name: 'Battle Master',
			features: [
				f('Combat Superiority', 3),
				f('Student of War', 3),
				f('Know Your Enemy', 7),
				f('Improved Combat Superiority', 10, 18),
				f('Relentless', 15)
			]
		},
		{
			name: 'Eldritch Knight',
			features: [
				f('Spellcasting', 3),
				f('Weapon Bond', 3),
				f('War Magic', 7),
				f('Eldritch Strike', 10),
				f('Arcane Charge', 15),
				f('Improved War Magic', 18)
			]
		}
	],
	monk: [
		{
			name: 'Way of the Open Hand',
			features: [
				f('Open Hand Technique', 3),
				f('Wholeness of Body', 6),
				f('Tranquility', 11),
				f('Quivering Palm', 17)
			]
		},
		{
			name: 'Way of Shadow',
			features: [
				f('Shadow Arts', 3),
				f('Shadow Step', 6),
				f('Cloak of Shadows', 11),
				f('Opportunist', 17)
			]
		},
		{
			name: 'Way of the Four Elements',
			features: [f('Disciple of the Elements', 3), f('Elemental Disciplines', 3, 6, 11, 17)]
		}
	],
	paladin: [
		{
			name: 'Oath of Devotion',
			features: [
				f('Tenets of Devotion', 3),
				f('Oath Spells', 3),
				f('Channel Divinity', 3),
				f('Aura of Devotion', 7),
				f('Purity of Spirit', 15),
				f('Holy Nimbus', 20)
			]
		},
		{
			name: 'Oath of the Ancients',
			features: [
				{
					name: 'Tenets of the Ancients',
					levels: [3],
					body: 'Roleplaying guidance, no mechanical effect: **Kindle the Light**, **Shelter the Light**, **Preserve Your Own Light**, **Be the Light**.'
				},
				{
					name: 'Oath Spells',
					levels: [3],
					body: OATH_SPELLS(['Ensnaring Strike, Speak with Animals',
						'Moonbeam, Misty Step',
						'Plant Growth, Protection from Energy',
						'Ice Storm, Stoneskin',
						'Commune with Nature, Tree Stride'])
				},
				{
					name: 'Channel Divinity',
					levels: [3],
					body: 'Two options, one use of Channel Divinity each.',
					options: [
						{
							label: "Nature's Wrath",
							body: '**Action:** spectral vines grab a creature you can see within 10 feet. **Strength or Dexterity save (its choice)** or be **restrained**, repeating the save at the end of each of its turns to break free.'
						},
						{
							label: 'Turn the Faithless',
							body: '**Action:** each **fey or fiend** within 30 feet that can hear you makes a **Wisdom save** or is **turned for 1 minute or until it takes damage**. A turned creature flees, cannot approach within 30 feet, cannot take reactions, and can only Dash or Dodge. **A disguised true form is revealed while turned.**'
						}
					]
				},
				{
					name: 'Aura of Warding',
					levels: [7, 18],
					body: 'You and friendly creatures within **10 feet** have **resistance to damage from spells**. The radius grows to **30 feet at 18th level**.'
				},
				{
					name: 'Undying Sentinel',
					levels: [15],
					body: 'When reduced to **0 hit points** without being killed outright, you may drop to **1** instead — once per long rest. You also suffer no drawbacks of old age and cannot be aged magically.'
				},
				{
					name: 'Elder Champion',
					levels: [20],
					body: [
						'**Action:** transform for **1 minute**.',
						'',
						'- Regain **10 hit points** at the start of each of your turns',
						'- Cast paladin spells with a **1-action** casting time as a **bonus action**',
						'- Enemies within 10 feet have **disadvantage on saves** against your paladin spells and Channel Divinity',
						'',
						'Once per long rest.'
					].join('\n')
				}
			]
		},
		{
			name: 'Oath of Vengeance',
			features: [
				{
					name: 'Tenets of Vengeance',
					levels: [3],
					body: 'Roleplaying guidance, no mechanical effect: **Fight the Greater Evil**, **No Mercy for the Wicked**, **By Any Means Necessary**, **Restitution**.'
				},
				{
					name: 'Oath Spells',
					levels: [3],
					body: OATH_SPELLS([
						"Bane, Hunter's Mark",
						'Hold Person, Misty Step',
						'Haste, Protection from Energy',
						'Banishment, Dimension Door',
						'Hold Monster, Scrying'
					])
				},
				{
					name: 'Channel Divinity',
					levels: [3],
					body: 'Two options, one use of Channel Divinity each.',
					options: [
						{
							label: 'Abjure Enemy',
							body: '**Action:** one creature you can see within 60 feet makes a **Wisdom save** unless immune to fear; **fiends and undead have disadvantage**. Failed — **frightened 1 minute or until it takes damage, speed 0** and no speed bonuses. Succeeded — **speed halved** on the same terms.'
						},
						{
							label: 'Vow of Enmity',
							body: '**Bonus action:** name a creature you can see within 10 feet. You have **advantage on attack rolls against it** for 1 minute, or until it drops to 0 hit points or falls unconscious.'
						}
					]
				},
				{
					name: 'Relentless Avenger',
					levels: [7],
					body: 'When you hit with an **opportunity attack**, move up to **half your speed** immediately after it as part of the same reaction. That movement **does not provoke** opportunity attacks.'
				},
				{
					name: 'Soul of Vengeance',
					levels: [15],
					body: 'When a creature under your **Vow of Enmity** makes an attack, use your **reaction to make a melee weapon attack** against it if it is in range.'
				},
				{
					name: 'Avenging Angel',
					levels: [20],
					body: [
						'**Action:** transform for **1 hour**.',
						'',
						'- Wings grant a **flying speed of 60 feet**',
						'- A **30-foot aura of menace**: the first time an enemy enters it or starts its turn there in a battle, **Wisdom save** or **frightened for 1 minute or until it takes damage**. Attacks against a creature frightened this way have **advantage**',
						'',
						'Once per long rest.'
					].join('\n')
				}
			]
		}
	],
	ranger: [
		{
			name: 'Hunter',
			features: [
				f("Hunter's Prey", 3),
				f('Defensive Tactics', 7),
				f('Multiattack', 11),
				f("Superior Hunter's Defense", 15)
			]
		},
		{
			name: 'Beast Master',
			features: [
				f("Ranger's Companion", 3),
				f('Exceptional Training', 7),
				f('Bestial Fury', 11),
				f('Share Spells', 15)
			]
		}
	],
	rogue: [
		{
			name: 'Thief',
			features: [
				f('Fast Hands', 3),
				f('Second-Story Work', 3),
				f('Supreme Sneak', 9),
				f('Use Magic Device', 13),
				f("Thief's Reflexes", 17)
			]
		},
		{
			name: 'Assassin',
			features: [
				f('Bonus Proficiencies', 3),
				f('Assassinate', 3),
				f('Infiltration Expertise', 9),
				f('Impostor', 13),
				f('Death Strike', 17)
			]
		},
		{
			name: 'Arcane Trickster',
			features: [
				f('Spellcasting', 3),
				f('Mage Hand Legerdemain', 3),
				f('Magical Ambush', 9),
				f('Versatile Trickster', 13),
				f('Spell Thief', 17)
			]
		}
	],
	sorcerer: [
		{
			name: 'Draconic Bloodline',
			features: [
				f('Dragon Ancestor', 1),
				f('Draconic Resilience', 1),
				f('Elemental Affinity', 6),
				f('Dragon Wings', 14),
				f('Draconic Presence', 18)
			]
		},
		{
			name: 'Wild Magic',
			features: [
				f('Wild Magic Surge', 1),
				f('Tides of Chaos', 1),
				f('Bend Luck', 6),
				f('Controlled Chaos', 14),
				f('Spell Bombardment', 18)
			]
		}
	],
	warlock: [
		{
			name: 'The Fiend',
			features: [
				f('Expanded Spell List', 1),
				f("Dark One's Blessing", 1),
				f("Dark One's Own Luck", 6),
				f('Fiendish Resilience', 10),
				f('Hurl Through Hell', 14)
			]
		},
		{
			name: 'The Archfey',
			features: [
				f('Expanded Spell List', 1),
				f('Fey Presence', 1),
				f('Misty Escape', 6),
				f('Beguiling Defenses', 10),
				f('Dark Delirium', 14)
			]
		},
		{
			name: 'The Great Old One',
			features: [
				f('Expanded Spell List', 1),
				f('Awakened Mind', 1),
				f('Entropic Ward', 6),
				f('Thought Shield', 10),
				f('Create Thrall', 14)
			]
		}
	],
	wizard: [
		{
			name: 'School of Abjuration',
			features: [
				f('Abjuration Savant', 2),
				f('Arcane Ward', 2),
				f('Projected Ward', 6),
				f('Improved Abjuration', 10),
				f('Spell Resistance', 14)
			]
		},
		{
			name: 'School of Conjuration',
			features: [
				f('Conjuration Savant', 2),
				f('Minor Conjuration', 2),
				f('Benign Transposition', 6),
				f('Focused Conjuration', 10),
				f('Durable Summons', 14)
			]
		},
		{
			name: 'School of Divination',
			features: [
				f('Divination Savant', 2),
				f('Portent', 2),
				f('Expert Divination', 6),
				f('The Third Eye', 10),
				f('Greater Portent', 14)
			]
		},
		{
			name: 'School of Enchantment',
			features: [
				f('Enchantment Savant', 2),
				f('Hypnotic Gaze', 2),
				f('Instinctive Charm', 6),
				f('Split Enchantment', 10),
				f('Alter Memories', 14)
			]
		},
		{
			name: 'School of Evocation',
			features: [
				f('Evocation Savant', 2),
				f('Sculpt Spells', 2),
				f('Potent Cantrip', 6),
				f('Empowered Evocation', 10),
				f('Overchannel', 14)
			]
		},
		{
			name: 'School of Illusion',
			features: [
				f('Illusion Savant', 2),
				f('Improved Minor Illusion', 2),
				f('Malleable Illusions', 6),
				f('Illusory Self', 10),
				f('Illusory Reality', 14)
			]
		},
		{
			name: 'School of Necromancy',
			features: [
				f('Necromancy Savant', 2),
				f('Grim Harvest', 2),
				f('Undead Thralls', 6),
				f('Inured to Undeath', 10),
				f('Command Undead', 14)
			]
		},
		{
			name: 'School of Transmutation',
			features: [
				f('Transmutation Savant', 2),
				f('Minor Alchemy', 2),
				f("Transmuter's Stone", 6),
				f('Shapechanger', 10),
				f('Master Transmuter', 14)
			]
		}
	]
}

export const SUBCLASSES_2024: SubclassIndex = {
	barbarian: [
		{
			name: 'Path of the Berserker',
			features: [
				f('Frenzy', 3),
				f('Mindless Rage', 6),
				f('Retaliation', 10),
				f('Intimidating Presence', 14)
			]
		},
		{
			name: 'Path of the Wild Heart',
			features: [
				f('Animal Speaker', 3),
				f('Rage of the Wilds', 3),
				f('Aspect of the Wilds', 6),
				f('Nature Speaker', 10),
				f('Power of the Wilds', 14)
			]
		},
		{
			name: 'Path of the World Tree',
			features: [
				f('Vitality of the Tree', 3),
				f('Branches of the Tree', 6),
				f('Battering Roots', 10),
				f('Travel along the Tree', 14)
			]
		},
		{
			name: 'Path of the Zealot',
			features: [
				f('Divine Fury', 3),
				f('Warrior of the Gods', 3),
				f('Fanatical Focus', 6),
				f('Zealous Presence', 10),
				f('Rage beyond Death', 14)
			]
		}
	],
	bard: [
		{
			name: 'College of Dance',
			features: [
				f('Dazzling Footwork', 3),
				f('Inspiring Movement', 6),
				f('Tandem Footwork', 6),
				f('Leading Evasion', 14)
			]
		},
		{
			name: 'College of Glamour',
			features: [
				f('Beguiling Magic', 3),
				f('Mantle of Inspiration', 3),
				f('Mantle of Majesty', 6),
				f('Unbreakable Majesty', 14)
			]
		},
		{
			name: 'College of Lore',
			features: [
				f('Bonus Proficiencies', 3),
				f('Cutting Words', 3),
				f('Magical Discoveries', 6),
				f('Peerless Skill', 14)
			]
		},
		{
			name: 'College of Valor',
			features: [
				f('Combat Inspiration', 3),
				f('Martial Training', 3),
				f('Extra Attack', 6),
				f('Battle Magic', 14)
			]
		}
	],
	cleric: [
		{
			name: 'Life Domain',
			features: [
				f('Disciple of Life', 3),
				f('Life Domain Spells', 3),
				f('Preserve Life', 3),
				f('Blessed Healer', 6),
				f('Supreme Healing', 17)
			]
		},
		{
			name: 'Light Domain',
			features: [
				f('Light Domain Spells', 3),
				f('Radiance of the Dawn', 3),
				f('Warding Flare', 3),
				f('Improved Warding Flare', 6),
				f('Potent Spellcasting', 17),
				f('Corona of Light', 17)
			]
		},
		{
			name: 'Trickery Domain',
			features: [
				f('Blessing of the Trickster', 3),
				f('Invoke Duplicity', 3),
				f('Trickery Domain Spells', 3),
				f("Trickster's Transposition", 6),
				f('Improved Duplicity', 17)
			]
		},
		{
			name: 'War Domain',
			features: [
				f('Guided Strike', 3),
				f('War Domain Spells', 3),
				f('War Priest', 3),
				f("War God's Blessing", 6),
				f('Divine Strike', 17),
				f('Avatar of Battle', 17)
			]
		}
	],
	druid: [
		{
			name: 'Circle of the Land',
			features: [
				f('Circle of the Land Spells', 3),
				f("Land's Aid", 3),
				f('Natural Recovery', 6),
				f("Nature's Ward", 10),
				f("Nature's Sanctuary", 14)
			]
		},
		{
			name: 'Circle of the Moon',
			features: [
				f('Circle Forms', 3),
				f('Circle of the Moon Spells', 3),
				f('Improved Circle Forms', 6),
				f('Moonlight Step', 10),
				f('Lunar Form', 14)
			]
		},
		{
			name: 'Circle of the Sea',
			features: [
				f('Circle of the Sea Spells', 3),
				f('Wrath of the Sea', 3),
				f('Aquatic Affinity', 6),
				f('Stormborn', 10),
				f('Oceanic Gift', 14)
			]
		},
		{
			name: 'Circle of the Stars',
			features: [
				f('Star Map', 3),
				f('Starry Form', 3),
				f('Cosmic Omen', 6),
				f('Twinkling Constellations', 10),
				f('Full of Stars', 14)
			]
		}
	],
	fighter: [
		{
			name: 'Battle Master',
			features: [
				f('Combat Superiority', 3),
				f('Student of War', 3),
				f('Know Your Enemy', 7),
				f('Improved Combat Superiority', 10, 18),
				f('Relentless', 15)
			]
		},
		{
			name: 'Champion',
			features: [
				f('Improved Critical', 3),
				f('Remarkable Athlete', 3),
				f('Additional Fighting Style', 7),
				f('Heroic Warrior', 10),
				f('Superior Critical', 15),
				f('Survivor', 18)
			]
		},
		{
			name: 'Eldritch Knight',
			features: [
				f('Spellcasting', 3),
				f('War Bond', 3),
				f('War Magic', 7),
				f('Eldritch Strike', 10),
				f('Arcane Charge', 15),
				f('Improved War Magic', 18)
			]
		},
		{
			name: 'Psi Warrior',
			features: [
				f('Psionic Power', 3),
				f('Telekinetic Adept', 7),
				f('Guarded Mind', 10),
				f('Bulwark of Force', 15),
				f('Telekinetic Master', 18)
			]
		}
	],
	monk: [
		{
			name: 'Warrior of Mercy',
			features: [
				f('Hand of Harm', 3),
				f('Hand of Healing', 3),
				f("Physician's Touch", 6),
				f('Flurry of Healing and Harm', 11),
				f('Hand of Ultimate Mercy', 17)
			]
		},
		{
			name: 'Warrior of Shadow',
			features: [
				f('Shadow Arts', 3),
				f('Shadow Step', 6),
				f('Improved Shadow Step', 11),
				f('Cloak of Shadows', 17)
			]
		},
		{
			name: 'Warrior of the Elements',
			features: [
				f('Elemental Attunement', 3),
				f('Manipulate Elements', 6),
				f('Stride of the Elements', 11),
				f('Elemental Epitome', 17)
			]
		},
		{
			name: 'Warrior of the Open Hand',
			features: [
				f('Open Hand Technique', 3),
				f('Wholeness of Body', 6),
				f('Fleet Step', 11),
				f('Quivering Palm', 17)
			]
		}
	],
	paladin: [
		{
			name: 'Oath of Devotion',
			features: [
				f('Oath of Devotion Spells', 3),
				f('Sacred Weapon', 3),
				f('Aura of Devotion', 7),
				f('Smite of Protection', 15),
				f('Holy Nimbus', 20)
			]
		},
		{
			name: 'Oath of Glory',
			features: [
				f('Inspiring Smite', 3),
				f('Oath of Glory Spells', 3),
				f('Peerless Athlete', 3),
				f('Aura of Alacrity', 7),
				f('Glorious Defense', 15),
				f('Living Legend', 20)
			]
		},
		{
			name: 'Oath of the Ancients',
			features: [
				f("Nature's Wrath", 3),
				f('Oath of the Ancients Spells', 3),
				f('Aura of Warding', 7),
				f('Undying Sentinel', 15),
				f('Elder Champion', 20)
			]
		},
		{
			name: 'Oath of Vengeance',
			features: [
				f('Oath of Vengeance Spells', 3),
				f('Vow of Enmity', 3),
				f('Relentless Avenger', 7),
				f('Soul of Vengeance', 15),
				f('Avenging Angel', 20)
			]
		}
	],
	ranger: [
		{
			name: 'Beast Master',
			features: [
				f('Primal Companion', 3),
				f('Exceptional Training', 7),
				f('Bestial Fury', 11),
				f('Share Spells', 15)
			]
		},
		{
			name: 'Fey Wanderer',
			features: [
				f('Dreadful Strikes', 3),
				f('Fey Wanderer Spells', 3),
				f('Otherworldly Glamour', 3),
				f('Beguiling Twist', 7),
				f('Fey Reinforcements', 11),
				f('Misty Wanderer', 15)
			]
		},
		{
			name: 'Gloom Stalker',
			features: [
				f('Dread Ambusher', 3),
				f('Gloom Stalker Spells', 3),
				f('Umbral Sight', 3),
				f('Iron Mind', 7),
				f("Stalker's Flurry", 11),
				f('Shadowy Dodge', 15)
			]
		},
		{
			name: 'Hunter',
			features: [
				f("Hunter's Lore", 3),
				f("Hunter's Prey", 3),
				f('Defensive Tactics', 7),
				f("Superior Hunter's Prey", 11),
				f("Superior Hunter's Defense", 15)
			]
		}
	],
	rogue: [
		{
			name: 'Arcane Trickster',
			features: [
				f('Mage Hand Legerdemain', 3),
				f('Spellcasting', 3),
				f('Magical Ambush', 9),
				f('Versatile Trickster', 13),
				f('Spell Thief', 17)
			]
		},
		{
			name: 'Assassin',
			features: [
				f('Assassinate', 3),
				f("Assassin's Tools", 3),
				f('Infiltration Expertise', 9),
				f('Envenom Weapons', 13),
				f('Death Strike', 17)
			]
		},
		{
			name: 'Soulknife',
			features: [
				f('Psionic Power', 3),
				f('Psychic Blades', 3),
				f('Soul Blades', 9),
				f('Psychic Veil', 13),
				f('Rend Mind', 17)
			]
		},
		{
			name: 'Thief',
			features: [
				f('Fast Hands', 3),
				f('Second-Story Work', 3),
				f('Supreme Sneak', 9),
				f('Use Magic Device', 13),
				f("Thief's Reflexes", 17)
			]
		}
	],
	sorcerer: [
		{
			name: 'Aberrant Sorcery',
			features: [
				f('Psionic Spells', 3),
				f('Telepathic Speech', 3),
				f('Psionic Sorcery', 6),
				f('Psychic Defenses', 6),
				f('Revelation in Flesh', 14),
				f('Warping Implosion', 18)
			]
		},
		{
			name: 'Clockwork Sorcery',
			features: [
				f('Clockwork Spells', 3),
				f('Restore Balance', 3),
				f('Bastion of Law', 6),
				f('Trance of Order', 14),
				f('Clockwork Cavalcade', 18)
			]
		},
		{
			name: 'Draconic Sorcery',
			features: [
				f('Draconic Resilience', 3),
				f('Draconic Spells', 3),
				f('Elemental Affinity', 6),
				f('Dragon Wings', 14),
				f('Dragon Companion', 18)
			]
		},
		{
			name: 'Wild Magic Sorcery',
			features: [
				f('Wild Magic Surge', 3),
				f('Tides of Chaos', 3),
				f('Bend Luck', 6),
				f('Controlled Chaos', 14),
				f('Tamed Surge', 18)
			]
		}
	],
	warlock: [
		{
			name: 'Archfey Patron',
			features: [
				f('Archfey Spells', 3),
				f('Steps of the Fey', 3),
				f('Misty Escape', 6),
				f('Beguiling Defenses', 10),
				f('Bewitching Magic', 14)
			]
		},
		{
			name: 'Celestial Patron',
			features: [
				f('Celestial Spells', 3),
				f('Healing Light', 3),
				f('Radiant Soul', 3),
				f('Celestial Resilience', 6),
				f('Searing Vengeance', 10),
				f('Celestial Aid', 14)
			]
		},
		{
			name: 'Fiend Patron',
			features: [
				f("Dark One's Blessing", 3),
				f('Fiend Spells', 3),
				f("Dark One's Own Luck", 6),
				f('Fiendish Resilience', 10),
				f('Hurl Through Hell', 14)
			]
		},
		{
			name: 'Great Old One Patron',
			features: [
				f('Awakened Mind', 3),
				f('Great Old One Spells', 3),
				f('Psychic Spells', 3),
				f('Clairvoyant Combatant', 6),
				f('Eldritch Hex', 10),
				f('Create Thrall', 14)
			]
		}
	],
	wizard: [
		{
			name: 'Abjurer',
			features: [
				f('Abjuration Savant', 3),
				f('Arcane Ward', 3),
				f('Projected Ward', 6),
				f('Spell Breaker', 10),
				f('Spell Resistance', 14)
			]
		},
		{
			name: 'Diviner',
			features: [
				f('Divination Savant', 3),
				f('Portent', 3),
				f('Expert Divination', 6),
				f('The Third Eye', 10),
				f('Greater Portent', 14)
			]
		},
		{
			name: 'Evoker',
			features: [
				f('Evocation Savant', 3),
				f('Potent Cantrip', 3),
				f('Sculpt Spells', 6),
				f('Empowered Evocation', 10),
				f('Overchannel', 14)
			]
		},
		{
			name: 'Illusionist',
			features: [
				f('Illusion Savant', 3),
				f('Improved Illusions', 3),
				f('Phantasmal Creatures', 6),
				f('Illusory Self', 10),
				f('Illusory Reality', 14)
			]
		}
	]
}

export const SUBCLASSES_XGTE: SubclassIndex = {
	barbarian: [
		{
			name: 'Path of the Ancestral Guardian',
			features: [
				f('Ancestral Protectors', 3),
				f('Spirit Shield', 6, 10, 14),
				f('Consult the Spirits', 10),
				f('Vengeful Ancestors', 14)
			]
		},
		{
			name: 'Path of the Storm Herald',
			features: [
				f('Storm Aura', 3),
				f('Storm Soul', 6),
				f('Shielding Storm', 10),
				f('Raging Storm', 14)
			]
		},
		{
			name: 'Path of the Zealot',
			features: [
				f('Divine Fury', 3),
				f('Warrior of the Gods', 3),
				f('Fanatical Focus', 6),
				f('Zealous Presence', 10),
				f('Rage beyond Death', 14)
			]
		}
	],
	bard: [
		{
			name: 'College of Glamour',
			features: [
				f('Mantle of Inspiration', 3),
				f('Enthralling Performance', 3),
				f('Mantle of Majesty', 6),
				f('Unbreakable Majesty', 14)
			]
		},
		{
			name: 'College of Swords',
			features: [
				f('Bonus Proficiencies', 3),
				f('Fighting Style', 3),
				f('Blade Flourish', 3),
				f('Extra Attack', 6),
				f("Master's Flourish", 14)
			]
		},
		{
			name: 'College of Whispers',
			features: [
				f('Psychic Blades', 3),
				f('Words of Terror', 3),
				f('Mantle of Whispers', 6),
				f('Shadow Lore', 14)
			]
		}
	],
	cleric: [
		{
			name: 'Forge Domain',
			features: [
				f('Bonus Proficiencies', 1),
				f('Blessing of the Forge', 1),
				f("Channel Divinity: Artisan's Blessing", 2),
				f('Soul of the Forge', 6),
				f('Divine Strike', 8),
				f('Saint of Forge and Fire', 17)
			]
		},
		{
			name: 'Grave Domain',
			features: [
				f('Circle of Mortality', 1),
				f('Eyes of the Grave', 1),
				f('Channel Divinity: Path to the Grave', 2),
				f("Sentinel at Death's Door", 6),
				f('Potent Spellcasting', 8),
				f('Keeper of Souls', 17)
			]
		}
	],
	druid: [
		{
			name: 'Circle of Dreams',
			features: [
				{
					name: 'Balm of the Summer Court',
					levels: [2],
					body: [
						'A pool of **d6 dice equal to your druid level**.',
						'',
						'**Bonus action:** pick an ally you can see within 120 feet and spend up to **half your druid level** in dice. They regain the total rolled, plus **1 temporary hit point per die spent**.',
						'',
						'The pool refills on a long rest.'
					].join('\n')
				},
				{
					name: 'Hearth of Moonlight and Shadow',
					levels: [6],
					body: [
						'At the start of a short or long rest, touch a point to raise an invisible **30-foot-radius sphere** centred there. Total cover blocks it.',
						'',
						'Inside it, you and your allies get **+5 to Stealth and Perception**, and light from open flames inside is not visible from outside.',
						'',
						'It ends when the rest ends or when you leave.'
					].join('\n')
				},
				{
					name: 'Hidden Paths',
					levels: [10],
					body: [
						'**Bonus action:** teleport yourself up to **60 feet** to an unoccupied space you can see.',
						'',
						'**Action:** teleport one willing creature you touch up to **30 feet** instead.',
						'',
						'Uses equal to your **Wisdom modifier** (minimum 1), refilled on a long rest.'
					].join('\n')
				},
				{
					name: 'Walker in Dreams',
					levels: [14],
					body: [
						'After a short rest, cast one of **Dream** (you as the messenger), **Scrying**, or **Teleportation Circle** free — no slot, no material components.',
						'',
						'That Teleportation Circle opens to wherever you last finished a long rest on your current plane. If you have not rested on this plane it fails, but the use is not spent.',
						'',
						'Once per long rest.'
					].join('\n')
				}
			]
		},
		{
			name: 'Circle of the Shepherd',
			features: [
				{
					name: 'Speech of the Woods',
					levels: [2],
					body: 'You speak, read and write **Sylvan**. Beasts understand your speech and you can read their noises and movements — enough for a friendly one to report what it recently saw or heard. It grants no special friendliness on its own.'
				},
				{
					name: 'Spirit Totem',
					levels: [2],
					body: [
						'**Bonus action:** summon an incorporeal spirit at a point you can see within 60 feet. It projects a **30-foot-radius aura** and counts as neither creature nor object. A bonus action moves it up to 60 feet.',
						'',
						'Lasts **1 minute**, once per short or long rest. Choose the spirit when you summon it.'
					].join('\n'),
					options: [
						{
							label: 'Bear Spirit',
							body: 'Creatures of your choice in the aura when it appears gain **temporary hit points equal to 5 + your druid level**. You and your allies have **advantage on Strength checks and Strength saving throws** while in it.'
						},
						{
							label: 'Hawk Spirit',
							body: 'When a creature makes an attack roll against a target in the aura, you can use your **reaction to give that attack advantage**. You and your allies have **advantage on Perception checks** while in it.'
						},
						{
							label: 'Unicorn Spirit',
							body: 'You and your allies have **advantage on ability checks to detect creatures** in the aura. When you spend a spell slot to restore hit points to any creature, each creature of your choice in the aura **also regains hit points equal to your druid level**.'
						}
					]
				},
				{
					name: 'Mighty Summoner',
					levels: [6],
					body: 'Any beast or fey you summon or create with a spell gets **2 extra hit points per Hit Die**, and its natural weapons count as **magical**.'
				},
				{
					name: 'Guardian Spirit',
					levels: [10],
					body: 'A beast or fey you summoned or created regains **half your druid level in hit points** when it ends its turn inside your Spirit Totem aura.'
				},
				{
					name: 'Faithful Summons',
					levels: [14],
					body: [
						'When you drop to **0 hit points** or are incapacitated against your will, you immediately gain the benefit of **Conjure Animals as if cast with a 9th-level slot** — four beasts of **CR 2 or lower**, appearing within 20 feet.',
						'',
						'They last 1 hour without concentration, or until dismissed, and defend you if given no commands.',
						'',
						'Once per long rest.'
					].join('\n')
				}
			]
		}
	],
	fighter: [
		{
			name: 'Arcane Archer',
			features: [
				f('Arcane Archer Lore', 3),
				f('Arcane Shot', 3),
				f('Magic Arrow', 7),
				f('Curving Shot', 7),
				f('Ever-Ready Shot', 15)
			]
		},
		{
			name: 'Cavalier',
			features: [
				f('Bonus Proficiency', 3),
				f('Born to the Saddle', 3),
				f('Unwavering Mark', 3),
				f('Warding Maneuver', 7),
				f('Hold the Line', 10),
				f('Ferocious Charger', 15),
				f('Vigilant Defender', 18)
			]
		},
		{
			name: 'Samurai',
			features: [
				f('Bonus Proficiency', 3),
				f('Fighting Spirit', 3),
				f('Elegant Courtier', 7),
				f('Tireless Spirit', 10),
				f('Rapid Strike', 15),
				f('Strength before Death', 18)
			]
		}
	],
	monk: [
		{
			name: 'Way of the Drunken Master',
			features: [
				f('Bonus Proficiencies', 3),
				f('Drunken Technique', 3),
				f('Tipsy Sway', 6),
				f("Drunkard's Luck", 11),
				f('Intoxicated Frenzy', 17)
			]
		},
		{
			name: 'Way of the Kensei',
			features: [
				f('Path of the Kensei', 3),
				f('One with the Blade', 6),
				f('Sharpen the Blade', 11),
				f('Unerring Accuracy', 17)
			]
		},
		{
			name: 'Way of the Sun Soul',
			features: [
				f('Radiant Sun Bolt', 3),
				f('Searing Arc Strike', 6),
				f('Searing Sunburst', 11),
				f('Sun Shield', 17)
			]
		}
	],
	paladin: [
		{
			name: 'Oath of Conquest',
			features: [
				{
					name: 'Tenets of Conquest',
					levels: [3],
					body: 'Roleplaying guidance, no mechanical effect: **Douse the Flame of Hope**, **Rule with an Iron Fist**, **Strength Above All**.'
				},
				{
					name: 'Oath Spells',
					levels: [3],
					body: OATH_SPELLS([
						'Armor of Agathys, Command',
						'Hold Person, Spiritual Weapon',
						'Bestow Curse, Fear',
						'Dominate Beast, Stoneskin',
						'Cloudkill, Dominate Person'
					])
				},
				{
					name: 'Channel Divinity',
					levels: [3],
					body: 'Two options, one use of Channel Divinity each.',
					options: [
						{
							label: 'Conquering Presence',
							body: '**Action:** each creature of your choice you can see within 30 feet makes a **Wisdom save** or is **frightened for 1 minute**, repeating the save at the end of each of its turns.'
						},
						{
							label: 'Guided Strike',
							body: '**+10 to an attack roll**, chosen **after seeing the roll** but before the DM says whether it hits.'
						}
					]
				},
				{
					name: 'Aura of Conquest',
					levels: [7, 18],
					body: 'While not incapacitated you emanate a **10-foot aura** (blocked by total cover). A creature **frightened of you** has its **speed reduced to 0** inside it, and takes **psychic damage equal to half your paladin level** if it starts its turn there. The radius grows to **30 feet at 18th level**.'
				},
				{
					name: 'Scornful Rebuke',
					levels: [15],
					body: 'Whenever a creature hits you with an attack and you are not incapacitated, it takes **psychic damage equal to your Charisma modifier** (minimum 1).'
				},
				{
					name: 'Invincible Conqueror',
					levels: [20],
					body: [
						'**Action:** become an avatar of conquest for **1 minute**.',
						'',
						'- **Resistance to all damage**',
						'- **One extra attack** whenever you take the Attack action',
						'- Melee weapon attacks **crit on 19 or 20**',
						'',
						'Once per long rest.'
					].join('\n')
				}
			]
		},
		{
			name: 'Oath of Redemption',
			features: [
				{
					name: 'Tenets of Redemption',
					levels: [3],
					body: 'Roleplaying guidance, no mechanical effect: **Peace**, **Innocence**, **Patience**, **Wisdom**.'
				},
				{
					name: 'Oath Spells',
					levels: [3],
					body: OATH_SPELLS([
						'Sanctuary, Sleep',
						'Calm Emotions, Hold Person',
						'Counterspell, Hypnotic Pattern',
						"Otiluke's Resilient Sphere, Stoneskin",
						'Hold Monster, Wall of Force'
					])
				},
				{
					name: 'Channel Divinity',
					levels: [3],
					body: 'Two options, one use of Channel Divinity each.',
					options: [
						{
							label: 'Emissary of Peace',
							body: '**Bonus action:** **+5 to Charisma (Persuasion) checks** for 10 minutes.'
						},
						{
							label: 'Rebuke the Violent',
							body: '**Reaction** immediately after an attacker within 30 feet damages someone other than you: **Wisdom save** or take **radiant damage equal to the damage it just dealt**, halved on a success.'
						}
					]
				},
				{
					name: 'Aura of the Guardian',
					levels: [7, 18],
					body: 'When a creature within **10 feet** takes damage, **reaction** to take that damage yourself instead. It transfers no accompanying effects and **cannot be reduced in any way**. The radius grows to **30 feet at 18th level**.'
				},
				{
					name: 'Protective Spirit',
					levels: [15],
					body: 'Regain **1d6 + half your paladin level** hit points when you end your turn in combat below **half your hit points** and are not incapacitated.'
				},
				{
					name: 'Emissary of Redemption',
					levels: [20],
					body: [
						'- **Resistance to all damage** dealt by other creatures',
						'- A creature that hits you takes **radiant damage equal to half the damage you took**',
						'',
						'Attack a creature, cast a spell on it, or damage it by any other means and **neither benefit applies against it until you finish a long rest**.'
					].join('\n')
				}
			]
		}
	],
	ranger: [
		{
			name: 'Gloom Stalker',
			features: [
				f('Gloom Stalker Magic', 3),
				f('Dread Ambusher', 3),
				f('Umbral Sight', 3),
				f('Iron Mind', 7),
				f("Stalker's Flurry", 11),
				f('Shadowy Dodge', 15)
			]
		},
		{
			name: 'Horizon Walker',
			features: [
				f('Horizon Walker Magic', 3),
				f('Detect Portal', 3),
				f('Planar Warrior', 3),
				f('Ethereal Step', 7),
				f('Distant Strike', 11),
				f('Spectral Defense', 15)
			]
		},
		{
			name: 'Monster Slayer',
			features: [
				f('Monster Slayer Magic', 3),
				f("Hunter's Sense", 3),
				f("Slayer's Prey", 3),
				f('Supernatural Defense', 7),
				f("Magic-User's Nemesis", 11),
				f("Slayer's Counter", 15)
			]
		}
	],
	rogue: [
		{
			name: 'Inquisitive',
			features: [
				f('Ear for Deceit', 3),
				f('Eye for Detail', 3),
				f('Insightful Fighting', 3),
				f('Steady Eye', 9),
				f('Unerring Eye', 13),
				f('Eye for Weakness', 17)
			]
		},
		{
			name: 'Mastermind',
			features: [
				f('Master of Intrigue', 3),
				f('Master of Tactics', 3),
				f('Insightful Manipulator', 9),
				f('Misdirection', 13),
				f('Soul of Deceit', 17)
			]
		},
		{
			name: 'Scout',
			features: [
				f('Skirmisher', 3),
				f('Survivalist', 3),
				f('Superior Mobility', 9),
				f('Ambush Master', 13),
				f('Sudden Strike', 17)
			]
		},
		{
			name: 'Swashbuckler',
			features: [
				f('Fancy Footwork', 3),
				f('Rakish Audacity', 3),
				f('Panache', 9),
				f('Elegant Maneuver', 13),
				f('Master Duelist', 17)
			]
		}
	],
	sorcerer: [
		{
			name: 'Divine Soul',
			features: [
				f('Divine Magic', 1),
				f('Favored by the Gods', 1),
				f('Empowered Healing', 6),
				f('Otherworldly Wings', 14),
				f('Unearthly Recovery', 18)
			]
		},
		{
			name: 'Shadow Magic',
			features: [
				f('Eyes of the Dark', 1),
				f('Strength of the Grave', 1),
				f('Hound of Ill Omen', 6),
				f('Shadow Walk', 14),
				f('Umbral Form', 18)
			]
		},
		{
			name: 'Storm Sorcery',
			features: [
				f('Wind Speaker', 1),
				f('Tempestuous Magic', 1),
				f('Heart of the Storm', 6),
				f('Storm Guide', 6),
				f("Storm's Fury", 14),
				f('Wind Soul', 18)
			]
		}
	],
	warlock: [
		{
			name: 'The Celestial',
			features: [
				f('Expanded Spell List', 1),
				f('Bonus Cantrips', 1),
				f('Healing Light', 1),
				f('Radiant Soul', 6),
				f('Celestial Resilience', 10),
				f('Searing Vengeance', 14)
			]
		},
		{
			name: 'The Hexblade',
			features: [
				f('Expanded Spell List', 1),
				f("Hexblade's Curse", 1),
				f('Hex Warrior', 1),
				f('Accursed Specter', 6),
				f('Armor of Hexes', 10),
				f('Master of Hexes', 14)
			]
		}
	],
	wizard: [
		{
			name: 'War Magic',
			features: [
				f('Arcane Deflection', 2),
				f('Tactical Wit', 2),
				f('Power Surge', 6),
				f('Durable Magic', 10),
				f('Deflecting Shroud', 14)
			]
		}
	]
}

export const SUBCLASSES_TCOE: SubclassIndex = {
	barbarian: [
		{
			name: 'Path of the Beast',
			features: [
				f('Form of the Beast', 3),
				f('Bestial Soul', 6),
				f('Infectious Fury', 10),
				f('Call the Hunt', 14)
			]
		},
		{
			name: 'Path of Wild Magic',
			features: [
				f('Magic Awareness', 3),
				f('Wild Surge', 3),
				f('Bolstering Magic', 6),
				f('Unstable Backlash', 10),
				f('Controlled Surge', 14)
			]
		}
	],
	bard: [
		{
			name: 'College of Creation',
			features: [
				f('Note of Potential', 3),
				f('Performance of Creation', 3),
				f('Animating Performance', 6),
				f('Creative Crescendo', 14)
			]
		},
		{
			name: 'College of Eloquence',
			features: [
				f('Silver Tongue', 3),
				f('Unsettling Words', 3),
				f('Unfailing Inspiration', 6),
				f('Universal Speech', 6),
				f('Infectious Inspiration', 14)
			]
		}
	],
	cleric: [
		{
			name: 'Order Domain',
			features: [
				f('Bonus Proficiencies', 1),
				f('Voice of Authority', 1),
				f("Channel Divinity: Order's Demand", 2),
				f('Embodiment of the Law', 6),
				f('Divine Strike', 8),
				f("Order's Wrath", 17)
			]
		},
		{
			name: 'Peace Domain',
			features: [
				f('Implement of Peace', 1),
				f('Emboldening Bond', 1),
				f('Channel Divinity: Balm of Peace', 2),
				f('Protective Bond', 6),
				f('Potent Spellcasting', 8),
				f('Expansive Bond', 17)
			]
		},
		{
			name: 'Twilight Domain',
			features: [
				f('Eyes of Night', 1),
				f('Vigilant Blessing', 1),
				f('Channel Divinity: Twilight Sanctuary', 2),
				f('Steps of Night', 6),
				f('Divine Strike', 8),
				f('Twilight Shroud', 17)
			]
		}
	],
	druid: [
		{
			name: 'Circle of Spores',
			source: "Guildmaster's Guide to Ravnica / Tasha's Cauldron of Everything",
			features: [
				{
					name: 'Circle Spells',
					levels: [2],
					body: [
						'Always prepared, never counting against your prepared limit, and druid spells for you even when they are off the list.',
						'',
						'| Druid Level | Circle Spells |',
						'| --- | --- |',
						'| 2nd | Chill Touch |',
						'| 3rd | Blindness/Deafness, Gentle Repose |',
						'| 5th | Animate Dead, Gaseous Form |',
						'| 7th | Blight, Confusion |',
						'| 9th | Cloudkill, Contagion |'
					].join('\n')
				},
				{
					name: 'Halo of Spores',
					levels: [2],
					body: [
						'**Reaction** when a creature you can see moves within 10 feet of you or starts its turn there: **1d4 necrotic** unless it succeeds on a **Constitution save** against your spell save DC.',
						'',
						'The die grows to **1d6 at 6th, 1d8 at 10th, 1d10 at 14th**.'
					].join('\n')
				},
				{
					name: 'Symbiotic Entity',
					levels: [2],
					body: [
						'**Action:** spend a Wild Shape use to wake the spores instead of transforming. Gain **4 temporary hit points per druid level**.',
						'',
						'While active:',
						'',
						'- Halo of Spores rolls its damage die **twice**',
						'- Your melee weapon hits deal an extra **1d6 necrotic**',
						'',
						'Lasts 10 minutes, until the temporary hit points are gone, or until you Wild Shape again.'
					].join('\n')
				},
				{
					name: 'Fungal Infestation',
					levels: [6],
					body: [
						'**Reaction** when a Small or Medium beast or humanoid dies within 10 feet: it rises with **1 hit point** as a **Zombie** (Monster Manual stat block) for **1 hour**, then collapses.',
						'',
						'It acts immediately after you, obeys your mental commands, and can only take the **Attack action for one melee attack**.',
						'',
						'Uses equal to your **Wisdom modifier** (minimum 1), refilled on a long rest.'
					].join('\n')
				},
				{
					name: 'Spreading Spores',
					levels: [10],
					body: [
						'**Bonus action** while Symbiotic Entity is active: throw spores up to 30 feet into a **10-foot cube** for 1 minute.',
						'',
						'A creature entering or starting its turn there takes your **Halo of Spores damage** (Constitution save to avoid), at most **once per turn**.',
						'',
						'Ends early if you use this again, dismiss it as a bonus action, or Symbiotic Entity ends. **You cannot use the Halo of Spores reaction while the cube lasts.**'
					].join('\n')
				},
				{
					name: 'Fungal Body',
					levels: [14],
					body: 'You cannot be **blinded, deafened, frightened or poisoned**, and a critical hit against you counts as a normal hit unless you are incapacitated.'
				}
			]
		},
		{
			name: 'Circle of Stars',
			features: [
				{
					name: 'Star Map',
					levels: [2],
					body: [
						'A Tiny object that works as a **spellcasting focus**. While holding it:',
						'',
						'- You know **Guidance**',
						'- **Guiding Bolt** is always prepared, counts as a druid spell, and does not count against your prepared limit',
						'- You can cast Guiding Bolt **without a slot, proficiency-bonus times per long rest**',
						'',
						'Lose it and a 1-hour ceremony during a rest makes a replacement, destroying the old one.',
						'',
						'| d6 | Map Form |',
						'| --- | --- |',
						'| 1 | A scroll covered with depictions of constellations |',
						'| 2 | A stone tablet with fine holes drilled through it |',
						'| 3 | A speckled owlbear hide, tooled with raised marks |',
						'| 4 | A collection of maps bound in an ebony cover |',
						'| 5 | A crystal that projects starry patterns before a light |',
						'| 6 | Glass disks that depict constellations |'
					].join('\n')
				},
				{
					name: 'Starry Form',
					levels: [2],
					body: [
						'**Bonus action:** spend a Wild Shape use to go starry rather than take a beast form.',
						'',
						'You keep your own statistics and shed **bright light 10 feet, dim light 10 beyond**. Lasts **10 minutes**, ending early if you dismiss it, are incapacitated, die, or use it again.',
						'',
						'Choose a constellation each time you assume the form.'
					].join('\n'),
					options: [
						{
							label: 'Archer',
							body: 'On activation, and as a **bonus action** on later turns, make a **ranged spell attack** against one creature within 60 feet for **1d8 + your Wisdom modifier radiant**.'
						},
						{
							label: 'Chalice',
							body: 'Whenever you spend a spell slot to restore hit points to a creature, **you or another creature within 30 feet** regains **1d8 + your Wisdom modifier**.'
						},
						{
							label: 'Dragon',
							body: 'On an **Intelligence or Wisdom check**, or a **Constitution save to hold concentration**, treat a d20 roll of **9 or lower as a 10**.'
						}
					]
				},
				{
					name: 'Cosmic Omen',
					levels: [6],
					body: [
						'After a long rest, consult the map and roll a die. Until your next long rest you gain one reaction, depending on the parity:',
						'',
						'- **Weal (even):** when a creature you can see within 30 feet is about to make an attack roll, save or ability check, **add 1d6** to it',
						'- **Woe (odd):** the same, but **subtract 1d6**',
						'',
						'Uses equal to your **proficiency bonus**, refilled on a long rest.'
					].join('\n')
				},
				{
					name: 'Twinkling Constellations',
					levels: [10],
					body: [
						'Archer and Chalice go from **1d8 to 2d8**, and Dragon grants a **flying speed of 20 feet with hovering**.',
						'',
						'You may also **change constellation at the start of each of your turns** while in Starry Form.'
					].join('\n')
				},
				{
					name: 'Full of Stars',
					levels: [14],
					body: 'While in Starry Form you are partly incorporeal, giving **resistance to bludgeoning, piercing and slashing damage**.'
				}
			]
		},
		{
			name: 'Circle of Wildfire',
			features: [
				f('Circle Spells', 2),
				f('Summon Wildfire Spirit', 2),
				f('Enhanced Bond', 6),
				f('Cauterizing Flames', 10),
				f('Blazing Revival', 14)
			]
		}
	],
	fighter: [
		{
			name: 'Psi Warrior',
			features: [
				f('Psionic Power', 3),
				f('Telekinetic Adept', 7),
				f('Guarded Mind', 10),
				f('Bulwark of Force', 15),
				f('Telekinetic Master', 18)
			]
		},
		{
			name: 'Rune Knight',
			features: [
				f('Bonus Proficiencies', 3),
				f('Rune Carver', 3),
				f("Giant's Might", 3),
				f('Runic Shield', 7),
				f('Great Stature', 7),
				f('Master of Runes', 10),
				f('Runic Juggernaut', 15)
			]
		}
	],
	monk: [
		{
			name: 'Way of Mercy',
			features: [
				f('Implements of Mercy', 3),
				f('Hand of Healing', 3),
				f('Hand of Harm', 3),
				f("Physician's Touch", 6),
				f('Flurry of Healing and Harm', 11),
				f('Hand of Ultimate Mercy', 17)
			]
		},
		{
			name: 'Way of the Astral Self',
			features: [
				f('Arms of the Astral Self', 3),
				f('Visage of the Astral Self', 6),
				f('Body of the Astral Self', 11),
				f('Awakened Astral Self', 17)
			]
		}
	],
	paladin: [
		{
			name: 'Oath of Glory',
			source: "Mythic Odysseys of Theros / Tasha's Cauldron of Everything",
			features: [
				{
					name: 'Tenets of Glory',
					levels: [3],
					body: 'Roleplaying guidance, no mechanical effect: **Actions over Words**, **Challenges Are but Tests**, **Hone the Body**, **Discipline the Soul**.'
				},
				{
					name: 'Oath Spells',
					levels: [3],
					body: OATH_SPELLS([
						'Guiding Bolt, Heroism',
						'Enhance Ability, Magic Weapon',
						'Haste, Protection from Energy',
						'Compulsion, Freedom of Movement',
						'Commune, Flame Strike'
					])
				},
				{
					name: 'Channel Divinity',
					levels: [3],
					body: 'Two options, one use of Channel Divinity each.',
					options: [
						{
							label: 'Peerless Athlete',
							body: '**Bonus action**, 10 minutes: **advantage on Athletics and Acrobatics**, **double carrying/pushing/dragging/lifting capacity**, and **+10 feet** to long and high jumps (the extra distance still costs movement).'
						},
						{
							label: 'Inspiring Smite',
							body: '**Bonus action** immediately after Divine Smite damage: hand out **2d8 + your paladin level temporary hit points**, split however you like among creatures within 30 feet, including yourself.'
						}
					]
				},
				{
					name: 'Aura of Alacrity',
					levels: [7, 18],
					body: 'Your walking speed increases by **10 feet**. While you are not incapacitated, any ally starting their turn within **5 feet** gains **+10 feet** of walking speed until the end of that turn. That range grows to **10 feet at 18th level**.'
				},
				{
					name: 'Glorious Defense',
					levels: [15],
					body: [
						'**Reaction** when you or a creature you can see within 10 feet is hit: add your **Charisma modifier** (minimum +1) to the target’s AC against that attack, possibly turning it into a miss.',
						'',
						'If it misses, **make one weapon attack against the attacker** as part of the same reaction, if they are in range.',
						'',
						'Uses equal to your **Charisma modifier** (minimum 1), refilled on a long rest.'
					].join('\n')
				},
				{
					name: 'Living Legend',
					levels: [20],
					body: [
						'**Bonus action**, 1 minute:',
						'',
						'- **Advantage on all Charisma checks**',
						'- **Once per turn**, turn a missed weapon attack into a **hit**',
						'- **Reaction to reroll a failed saving throw**; you must take the new roll',
						'',
						'Once per long rest, or again by spending a **5th-level spell slot**.'
					].join('\n')
				}
			]
		},
		{
			name: 'Oath of the Watchers',
			features: [
				{
					name: 'Tenets of the Watchers',
					levels: [3],
					body: 'Roleplaying guidance, no mechanical effect: **Vigilance**, **Loyalty**, **Discipline**.'
				},
				{
					name: 'Oath Spells',
					levels: [3],
					body: OATH_SPELLS([
						'Alarm, Detect Magic',
						'Moonbeam, See Invisibility',
						'Counterspell, Nondetection',
						'Aura of Purity, Banishment',
						'Hold Monster, Scrying'
					])
				},
				{
					name: 'Channel Divinity',
					levels: [3],
					body: 'Two options, one use of Channel Divinity each.',
					options: [
						{
							label: "Watcher's Will",
							body: '**Action:** choose up to your **Charisma modifier** in creatures you can see within 30 feet (minimum 1). For 1 minute you and they have **advantage on Intelligence, Wisdom and Charisma saves**.'
						},
						{
							label: 'Abjure the Extraplanar',
							body: '**Action:** each **aberration, celestial, elemental, fey or fiend** within 30 feet that can hear you makes a **Wisdom save** or is **turned for 1 minute or until it takes damage** — fleeing, unable to end its move within 30 feet, and limited to Dash or Dodge.'
						}
					]
				},
				{
					name: 'Aura of the Sentinel',
					levels: [7, 18],
					body: 'While not incapacitated, you and creatures of your choice within **10 feet** add your **proficiency bonus to initiative**. The radius grows to **30 feet at 18th level**.'
				},
				{
					name: 'Vigilant Rebuke',
					levels: [15],
					body: 'Whenever you or a creature you can see within 30 feet **succeeds** on an Intelligence, Wisdom or Charisma save, **reaction** to deal **2d8 + your Charisma modifier force damage** to whatever forced that save.'
				},
				{
					name: 'Mortal Bulwark',
					levels: [20],
					body: [
						'**Bonus action**, 1 minute:',
						'',
						'- **Truesight out to 120 feet**',
						'- **Advantage on attacks** against aberrations, celestials, elementals, fey and fiends',
						'- On hitting and damaging a creature, force a **Charisma save** against your spell save DC or it is **banished to its native plane** if it is not already there. On a success it cannot be banished this way for 24 hours',
						'',
						'Once per long rest, or again by spending a **5th-level spell slot**.'
					].join('\n')
				}
			]
		}
	],
	ranger: [
		{
			name: 'Fey Wanderer',
			features: [
				f('Dreadful Strikes', 3),
				f('Fey Wanderer Magic', 3),
				f('Otherworldly Glamour', 3),
				f('Beguiling Twist', 7),
				f('Fey Reinforcements', 11),
				f('Misty Wanderer', 15)
			]
		},
		{
			name: 'Swarmkeeper',
			features: [
				f('Gathered Swarm', 3),
				f('Swarmkeeper Magic', 3),
				f('Writhing Tide', 7),
				f('Mighty Swarm', 11),
				f('Swarming Dispersal', 15)
			]
		}
	],
	rogue: [
		{
			name: 'Phantom',
			features: [
				f('Whispers of the Dead', 3),
				f('Wails from the Grave', 3),
				f('Tokens of the Departed', 9),
				f('Ghost Walk', 13),
				f("Death's Friend", 17)
			]
		},
		{
			name: 'Soulknife',
			features: [
				f('Psionic Power', 3),
				f('Psychic Blades', 3),
				f('Soul Blades', 9),
				f('Psychic Veil', 13),
				f('Rend Mind', 17)
			]
		}
	],
	sorcerer: [
		{
			name: 'Aberrant Mind',
			features: [
				f('Psionic Spells', 1),
				f('Telepathic Speech', 1),
				f('Psionic Sorcery', 6),
				f('Psychic Defenses', 6),
				f('Revelation in Flesh', 14),
				f('Warping Implosion', 18)
			]
		},
		{
			name: 'Clockwork Soul',
			features: [
				f('Clockwork Magic', 1),
				f('Restore Balance', 1),
				f('Bastion of Law', 6),
				f('Trance of Order', 14),
				f('Clockwork Cavalcade', 18)
			]
		}
	],
	warlock: [
		{
			name: 'The Fathomless',
			features: [
				f('Expanded Spell List', 1),
				f('Tentacle of the Deeps', 1),
				f('Gift of the Sea', 1),
				f('Oceanic Soul', 6),
				f('Guardian Coil', 6),
				f('Grasping Tentacles', 10),
				f('Fathomless Plunge', 14)
			]
		},
		{
			name: 'The Genie',
			features: [
				f('Expanded Spell List', 1),
				f("Genie's Vessel", 1),
				f('Elemental Gift', 6),
				f('Sanctuary Vessel', 10),
				f('Limited Wish', 14)
			]
		}
	],
	wizard: [
		{
			name: 'Bladesinging',
			features: [
				f('Training in War and Song', 2),
				f('Bladesong', 2),
				f('Extra Attack', 6),
				f('Song of Defense', 10),
				f('Song of Victory', 14)
			]
		},
		{
			name: 'Order of Scribes',
			features: [
				f('Wizardly Quill', 2),
				f('Awakened Spellbook', 2),
				f('Manifest Mind', 6),
				f('Master Scrivener', 10),
				f('One with the Word', 14)
			]
		}
	]
}

/**
 * Subclasses from books with too few entries to deserve their own constant. Each names its own
 * source, so this grows without needing a new export every time a one-off shows up.
 */
export const SUBCLASSES_MISC: SubclassIndex = {
	paladin: [
		{
			name: 'Oath of the Crown',
			source: "Sword Coast Adventurer's Guide",
			features: [
				{
					name: 'Tenets of the Crown',
					levels: [3],
					body: 'Roleplaying guidance, no mechanical effect, and often set by the sovereign you serve: **Law**, **Loyalty**, **Courage**, **Responsibility**.'
				},
				{
					name: 'Oath Spells',
					levels: [3],
					body: OATH_SPELLS([
						'Command, Compelled Duel',
						'Warding Bond, Zone of Truth',
						'Aura of Vitality, Spirit Guardians',
						'Banishment, Guardian of Faith',
						'Circle of Power, Geas'
					])
				},
				{
					name: 'Channel Divinity',
					levels: [3],
					body: 'Two options, one use of Channel Divinity each.',
					options: [
						{
							label: 'Champion Challenge',
							body: '**Bonus action:** each creature of your choice you can see within 30 feet makes a **Wisdom save** or **cannot willingly move more than 30 feet away from you**. It ends if you are incapacitated or die, or if the creature gets more than 30 feet away.'
						},
						{
							label: 'Turn the Tide',
							body: '**Bonus action:** each creature of your choice within 30 feet that can hear you and is at **half hit points or below** regains **1d6 + your Charisma modifier** (minimum 1).'
						}
					]
				},
				{
					name: 'Divine Allegiance',
					levels: [7],
					body: '**Reaction** when a creature within **5 feet** takes damage: take the damage yourself instead, so they take none. **The damage to you cannot be reduced or prevented in any way.**'
				},
				{
					name: 'Unyielding Saint',
					levels: [15],
					body: '**Advantage on saving throws** to avoid being **paralyzed or stunned**.'
				},
				{
					name: 'Exalted Champion',
					levels: [20],
					body: [
						'**Action**, 1 hour:',
						'',
						'- **Resistance to bludgeoning, piercing and slashing from nonmagical weapons**',
						'- Allies within 30 feet have **advantage on death saving throws**',
						'- **Advantage on Wisdom saves** for you and allies within 30 feet',
						'',
						'Ends early if you are incapacitated or die. Once per long rest.'
					].join('\n')
				}
			]
		},
		{
			name: 'Oathbreaker',
			source: "Dungeon Master's Guide",
			features: [
				{
					name: 'Oath Spells',
					levels: [3],
					body: OATH_SPELLS([
						'Hellish Rebuke, Inflict Wounds',
						'Crown of Madness, Darkness',
						'Animate Dead, Bestow Curse',
						'Blight, Confusion',
						'Contagion, Dominate Person'
					])
				},
				{
					name: 'Channel Divinity',
					levels: [3],
					body: 'Two options, one use of Channel Divinity each.',
					options: [
						{
							label: 'Control Undead',
							body: '**Action:** one undead you can see within 30 feet makes a **Wisdom save** or **obeys your commands for 24 hours**, or until you use this again. **Immune if its challenge rating is equal to or above your paladin level.**'
						},
						{
							label: 'Dreadful Aspect',
							body: '**Action:** each creature of your choice within 30 feet that can see you makes a **Wisdom save** or is **frightened for 1 minute**. A creature frightened this way that ends its turn more than 30 feet from you may retry the save.'
						}
					]
				},
				{
					name: 'Aura of Hate',
					levels: [7, 18],
					body: 'You, and any **fiends and undead** within **10 feet**, add your **Charisma modifier to melee weapon damage rolls** (minimum +1). A creature can benefit from only one paladin’s aura at a time. The radius grows to **30 feet at 18th level**.'
				},
				{
					name: 'Supernatural Resistance',
					levels: [15],
					body: '**Resistance to bludgeoning, piercing and slashing damage from nonmagical weapons.**'
				},
				{
					name: 'Dread Lord',
					levels: [20],
					body: [
						'**Action:** a **30-foot aura of gloom** for 1 minute that reduces bright light there to dim.',
						'',
						'- An enemy **frightened by you** that starts its turn in the aura takes **4d10 psychic damage**',
						'- You and creatures of your choice in the aura are wrapped in deeper shadow: creatures relying on sight have **disadvantage on attacks** against them',
						'- **Bonus action** while it lasts: a **melee spell attack** against one creature in the aura for **3d10 + your Charisma modifier necrotic**',
						'',
						'Once per long rest.'
					].join('\n')
				}
			]
		}
	]
}

/** Stamp the book each outline came from, leaving any entry that already names its own — a few
 *  subclasses were printed in one book and reprinted in another. */
function tag(index: SubclassIndex, source: string): SubclassIndex {
	return Object.fromEntries(
		Object.entries(index).map(([slug, subs]) => [
			slug,
			subs.map((s) => ({ ...s, source: s.source ?? source }))
		])
	)
}

/**
 * The 2014 ruleset accumulates across books; 2024 is the Player's Handbook alone so far. Expansion
 * subclasses are the same tier as the PHB outlines above — names and levels, no rules text.
 */
export function subclassIndex(version: ClassVersion): SubclassIndex {
	if (version === '2024') return tag(SUBCLASSES_2024, SOURCES.phb2024)
	const merged = tag(SUBCLASSES_2014, SOURCES.phb2014)
	for (const [index, source] of [
		[SUBCLASSES_XGTE, SOURCES.xgte],
		[SUBCLASSES_TCOE, SOURCES.tcoe],
		// Every MISC entry names its own book, so the fallback here is never reached.
		[SUBCLASSES_MISC, 'Other']
	] as const) {
		for (const [slug, subs] of Object.entries(tag(index, source))) {
			merged[slug] = [...(merged[slug] ?? []), ...subs]
		}
	}
	return merged
}
