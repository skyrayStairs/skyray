// Structural index of published subclasses — Player's Handbook (both rulesets), plus Xanathar's
// Guide to Everything, Tasha's Cauldron of Everything and a handful from other books for 2014.
// Name, feature names, and the levels they arrive at.
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
		/** How many of those options you keep, and the levels the allowance grows at. See `chooseCount`. */
		choose?: { level: number; count: number }[]
	}[]
	/** Which book it comes from. Grouped by this in the picker so provenance is visible. */
	source?: string
}

/** slug -> subclasses, per ruleset. Includes the SRD subclass so the list reads as one whole set. */
export type SubclassIndex = Record<string, SubclassOutline[]>

const f = (name: string, ...levels: number[]) => ({ name, levels })

/** `picks([3, 2], [7, 3])` — two options from 3rd level, three from 7th. */
const picks = (...steps: [level: number, count: number][]) =>
	steps.map(([level, count]) => ({ level, count }))

/**
 * Paladin oaths and ranger archetypes both hand out subclass spells on the same 3/5/9/13/17 ladder,
 * so only the spells and the wording of the caveat differ. Sorcerer origins use the same shape one
 * step earlier, on 1/3/5/7/9.
 */
const spellLadder = (
	who: string,
	note: string,
	rows: string[],
	at = ['3rd', '5th', '9th', '13th', '17th']
) =>
	[
		note,
		'',
		`| ${who} Level | Spells |`,
		'| --- | --- |',
		...at.map((lv, i) => `| ${lv} | ${rows[i]} |`)
	].join('\n')

const OATH_SPELLS = (rows: string[]) =>
	spellLadder(
		'Paladin',
		'Always prepared, and they do not count against the number of spells you can prepare.',
		rows
	)

const RANGER_SPELLS = (rows: string[]) =>
	spellLadder(
		'Ranger',
		'Each counts as a ranger spell for you, but does not count against the number you know.',
		rows
	)

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
				{
					name: 'Improved Critical',
					levels: [3],
					body: 'Your **weapon attacks score a critical hit on a 19 or 20**.'
				},
				{
					name: 'Remarkable Athlete',
					levels: [7],
					body: 'Add **half your proficiency bonus, rounded up**, to any **Strength, Dexterity or Constitution check** that does not already use it. Your **running long jump** covers an extra number of feet equal to **your Strength modifier**.'
				},
				{
					name: 'Additional Fighting Style',
					levels: [10],
					body: 'A **second option from Fighting Style**.'
				},
				{
					name: 'Superior Critical',
					levels: [15],
					body: 'Your **weapon attacks score a critical hit on an 18–20**.'
				},
				{
					name: 'Survivor',
					levels: [18],
					body: 'At the start of each of your turns, regain **5 + your Constitution modifier** hit points if you are at **half your hit points or below**. Nothing at **0 hit points**.'
				}
			]
		},
		{
			name: 'Battle Master',
			features: [
				{
					name: 'Combat Superiority',
					levels: [3, 7, 10, 15],
					choose: picks([3, 3], [7, 5], [10, 7], [15, 9]),
					body: [
						'- **Maneuvers.** Three of your choice, **two more at 7th, 10th and 15th level**. Each time you learn new ones you may **swap one you know**. Using a maneuver **expends one superiority die**, and you can use **only one maneuver per attack**.',
						'- **Superiority dice.** Four **d8s**, **one more at 7th level** and **one more at 15th**. A die is spent when used; all of them return on a **short or long rest**.',
						'- **Maneuver save DC** = 8 + your proficiency bonus + **your Strength or Dexterity modifier** (your choice).',
						'',
						'Every maneuver below spends one of those dice. The list spans the **Player’s Handbook** and **Xanathar’s Guide to Everything** — Ambush, Bait and Switch, Brace, Commanding Presence, Grappling Strike, Quick Toss and Tactical Assessment come from the latter.'
					].join('\n'),
					options: [
						{
							label: 'Ambush',
							body: 'Add the die to a **Dexterity (Stealth)** check or an **initiative roll**, unless you are incapacitated.'
						},
						{
							label: 'Bait and Switch',
							body: 'On your turn, spend **at least 5 feet of movement** to **swap places with a willing creature within 5 feet** that is not incapacitated — that movement **provokes no opportunity attacks**. Roll the die: **you or that creature** (your choice) gains **that much AC** until the start of your next turn.'
						},
						{
							label: 'Brace',
							body: '**Reaction** when a creature you can see **moves into the reach** of the melee weapon you wield: **one attack** with that weapon, adding the die to its **damage** on a hit.'
						},
						{
							label: "Commander's Strike",
							body: 'On the Attack action, **forgo one of your attacks** and spend a **bonus action**: one friendly creature that can see or hear you **uses its reaction to make one weapon attack**, adding the die to that attack’s **damage**.'
						},
						{
							label: 'Commanding Presence',
							body: 'Add the die to a **Charisma (Intimidation, Performance or Persuasion)** check.'
						},
						{
							label: 'Disarming Attack',
							body: 'On a hit: add the die to the **damage**, and the target makes a **Strength save** or **drops one item of your choice** that it holds, at its feet.'
						},
						{
							label: 'Distracting Strike',
							body: 'On a hit: add the die to the **damage**, and the **next attack roll against that target by anyone but you** has **advantage**, if it comes before the start of your next turn.'
						},
						{
							label: 'Evasive Footwork',
							body: 'When you move, roll the die and **add it to your AC until you stop moving**.'
						},
						{
							label: 'Feinting Attack',
							body: '**Bonus action:** feint at one creature within 5 feet. You have **advantage on your next attack roll against it this turn**, and on a hit you add the die to the **damage**.'
						},
						{
							label: 'Goading Attack',
							body: 'On a hit: add the die to the **damage**, and the target makes a **Wisdom save** or has **disadvantage on attack rolls against anyone but you** until the end of your next turn.'
						},
						{
							label: 'Grappling Strike',
							body: 'Immediately after you hit with a **melee attack** on your turn, **bonus action** to try to **grapple** the target, adding the die to your **Strength (Athletics)** check.'
						},
						{
							label: 'Lunging Attack',
							body: 'On a melee weapon attack on your turn, **increase your reach by 5 feet** for that attack, and on a hit add the die to the **damage**.'
						},
						{
							label: 'Maneuvering Attack',
							body: 'On a hit: add the die to the **damage**, and one friendly creature that can see or hear you **uses its reaction to move up to half its speed** without provoking an opportunity attack **from the target of your attack**.'
						},
						{
							label: 'Menacing Attack',
							body: 'On a hit: add the die to the **damage**, and the target makes a **Wisdom save** or is **frightened of you** until the end of your next turn.'
						},
						{
							label: 'Parry',
							body: '**Reaction** when a creature damages you with a **melee attack**: reduce that damage by **the die + your Dexterity modifier**.'
						},
						{
							label: 'Precision Attack',
							body: 'Add the die to a **weapon attack roll** — **before or after you roll**, but before any of the attack’s effects apply.'
						},
						{
							label: 'Pushing Attack',
							body: 'On a hit: add the die to the **damage**, and a target that is **Large or smaller** makes a **Strength save** or is **pushed up to 15 feet away** from you.'
						},
						{
							label: 'Quick Toss',
							body: '**Bonus action:** a ranged attack with a **thrown** weapon, which you may **draw as part of the attack**, adding the die to its **damage** on a hit.'
						},
						{
							label: 'Rally',
							body: '**Bonus action:** one friendly creature that can see or hear you gains **temporary hit points equal to the die + your Charisma modifier**.'
						},
						{
							label: 'Riposte',
							body: '**Reaction** when a creature **misses you with a melee attack**: one melee weapon attack against it, adding the die to its **damage** on a hit.'
						},
						{
							label: 'Sweeping Attack',
							body: 'On a hit with a **melee weapon attack**, choose a second creature **within 5 feet of the target and within your reach**. If your attack roll would hit that creature too, it takes **damage equal to the die alone**, of the **same type as the original attack**.'
						},
						{
							label: 'Tactical Assessment',
							body: 'Add the die to an **Intelligence (Investigation or History)** or **Wisdom (Insight)** check.'
						},
						{
							label: 'Trip Attack',
							body: 'On a hit: add the die to the **damage**, and a target that is **Large or smaller** makes a **Strength save** or is **knocked prone**.'
						}
					]
				},
				{
					name: 'Student of War',
					levels: [3],
					body: 'Proficiency with **one type of artisan’s tools** of your choice.'
				},
				{
					name: 'Know Your Enemy',
					levels: [7],
					body: '**One minute** observing or interacting with a creature outside combat tells you whether it is your **equal, superior or inferior** in **two** characteristics of your choice: **Strength, Dexterity, Constitution, AC, current hit points, total class levels, fighter levels**.'
				},
				{
					name: 'Improved Combat Superiority',
					levels: [10, 18],
					body: 'Your superiority dice become **d10s**, and **d12s at 18th level**.'
				},
				{
					name: 'Relentless',
					levels: [15],
					body: 'Roll initiative with **no superiority dice left** and you **regain one**.'
				}
			]
		},
		{
			name: 'Eldritch Knight',
			features: [
				{
					name: 'Spellcasting',
					levels: [3],
					body: [
						'You cast **wizard spells** using **Intelligence**: **save DC** = 8 + your proficiency bonus + Intelligence modifier, **attack bonus** = proficiency bonus + Intelligence modifier. Slots return on a **long rest**.',
						'',
						'Your first three 1st-level spells include **two abjuration or evocation** ones, and every spell learned afterwards must be **abjuration or evocation** — except those gained at **8th, 14th and 20th level**, which may come from **any school**. On each fighter level you may **swap one spell** under the same restriction.',
						'',
						'| Fighter Level | Cantrips | Spells | Slots (1st/2nd/3rd/4th) |',
						'| --- | --- | --- | --- |',
						'| 3rd | 2 | 3 | 2 |',
						'| 4th | 2 | 4 | 3 |',
						'| 7th | 2 | 5 | 4 / 2 |',
						'| 8th | 2 | 6 | 4 / 2 |',
						'| 10th | 3 | 7 | 4 / 3 |',
						'| 11th | 3 | 8 | 4 / 3 |',
						'| 13th | 3 | 9 | 4 / 3 / 2 |',
						'| 14th | 3 | 10 | 4 / 3 / 2 |',
						'| 16th | 3 | 11 | 4 / 3 / 3 |',
						'| 19th | 3 | 12 | 4 / 3 / 3 / 1 |',
						'| 20th | 3 | 13 | 4 / 3 / 3 / 1 |',
						'',
						'Levels not listed repeat the row above.'
					].join('\n')
				},
				{
					name: 'Weapon Bond',
					levels: [3],
					body: 'A **1-hour ritual**, which a short rest covers, bonds a weapon that stays within reach throughout. You **cannot be disarmed** of a bonded weapon unless incapacitated, and while it is on the same plane you can **summon it to your hand as a bonus action**. **Two bonded weapons** at most, one summoned per bonus action; bonding a third breaks one of the others.'
				},
				{
					name: 'War Magic',
					levels: [7],
					body: 'Cast a **cantrip with your action** and you can make **one weapon attack as a bonus action**.'
				},
				{
					name: 'Eldritch Strike',
					levels: [10],
					body: 'Hit a creature with a weapon attack and it has **disadvantage on its next saving throw against a spell you cast**, before the end of your next turn.'
				},
				{
					name: 'Arcane Charge',
					levels: [15],
					body: 'When you **Action Surge**, **teleport up to 30 feet** to an unoccupied space you can see, before or after the extra action.'
				},
				{
					name: 'Improved War Magic',
					levels: [18],
					body: 'Cast **any spell with your action** and you can make **one weapon attack as a bonus action**.'
				}
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
					body: OATH_SPELLS([
						'Ensnaring Strike, Speak with Animals',
						'Moonbeam, Misty Step',
						'Plant Growth, Protection from Energy',
						'Ice Storm, Stoneskin',
						'Commune with Nature, Tree Stride'
					])
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
				{
					name: "Ranger's Companion",
					levels: [3],
					body: [
						'A beast of **Medium or smaller** size and **CR 1/4 or lower**. Add your **proficiency bonus** to its AC, attack rolls, damage rolls, and any saves and skills it is proficient in. Its **hit point maximum is the higher of its own or four times your ranger level**, and it can spend Hit Dice on a short rest.',
						'',
						'It acts on your initiative. Commanding it to **move** costs nothing; commanding it to **Attack, Dash, Disengage or Help** costs your **action**. Uncommanded, it **Dodges**. Once you have Extra Attack, you may make one weapon attack yourself when you command it to Attack.',
						'',
						'It never needs a command to use its **reaction**. If you are incapacitated or absent it acts on its own to protect you both. Travelling through your favoured terrain with only the beast, you can **move stealthily at a normal pace**.',
						'',
						'If it dies, **8 hours** of bonding gets you another non-hostile beast.'
					].join('\n')
				},
				{
					name: 'Primal Companion (optional)',
					levels: [3],
					body: [
						"**Tasha's optional replacement for Ranger's Companion.** You summon a primal beast that is friendly to you and obeys you; pick its stat block below. It uses your proficiency bonus (**PB**) throughout.",
						'',
						'It acts on your turn. It moves and uses its reaction on its own, but its only action is **Dodge** unless you spend a **bonus action** to command another, or **sacrifice one of your attacks** on the Attack action to have it Attack. If you are incapacitated it acts freely.',
						'',
						'Dead within the last hour: **action + a spell slot of 1st level or higher** revives it with full hit points after 1 minute. A long rest lets you summon a different one; the old vanishes, as does the beast if you die.',
						'',
						'All three share **Primal Bond**: add your proficiency bonus to any ability check or save the beast makes.'
					].join('\n'),
					options: [
						{
							label: 'Beast of the Land',
							body: [
								'Medium beast · **AC 13 + PB** · **HP 5 + 5 per ranger level** (d8 Hit Dice) · Speed **40 ft., climb 40 ft.** · darkvision 60 ft.',
								'',
								'| STR | DEX | CON | INT | WIS | CHA |',
								'| --- | --- | --- | --- | --- | --- |',
								'| 14 | 14 | 15 | 8 | 14 | 11 |',
								'',
								'**Charge.** Move at least 20 feet straight at a target and hit it with Maul the same turn: **+1d6 slashing**, and a creature must make a **Strength save** against your spell save DC or be **knocked prone**.',
								'',
								'**Maul.** Melee attack, your spell attack modifier, reach 5 ft. **1d8 + 2 + PB slashing**.'
							].join('\n')
						},
						{
							label: 'Beast of the Sea',
							body: [
								'Medium beast · **AC 13 + PB** · **HP 5 + 5 per ranger level** (d8 Hit Dice) · Speed **5 ft., swim 60 ft.** · darkvision 60 ft. · **Amphibious**',
								'',
								'| STR | DEX | CON | INT | WIS | CHA |',
								'| --- | --- | --- | --- | --- | --- |',
								'| 14 | 14 | 15 | 8 | 14 | 11 |',
								'',
								'**Binding Strike.** Melee attack, your spell attack modifier, reach 5 ft. **1d6 + 2 + PB piercing or bludgeoning** (your choice), and the target is **grappled** (escape DC = your spell save DC). It cannot use this attack on anyone else until that grapple ends.'
							].join('\n')
						},
						{
							label: 'Beast of the Sky',
							body: [
								'Small beast · **AC 13 + PB** · **HP 4 + 4 per ranger level** (d6 Hit Dice) · Speed **10 ft., fly 60 ft.** · darkvision 60 ft.',
								'',
								'| STR | DEX | CON | INT | WIS | CHA |',
								'| --- | --- | --- | --- | --- | --- |',
								'| 6 | 16 | 13 | 8 | 14 | 11 |',
								'',
								'**Flyby.** No opportunity attacks provoked when it flies out of reach.',
								'',
								'**Shred.** Melee attack, your spell attack modifier, reach 5 ft. **1d4 + 3 + PB slashing**.'
							].join('\n')
						}
					]
				},
				{
					name: 'Exceptional Training',
					levels: [7],
					body: 'On a turn your companion does not attack, a **bonus action** commands it to **Dash, Disengage or Help**. Its attacks also count as **magical**.'
				},
				{
					name: 'Bestial Fury',
					levels: [11],
					body: 'When commanded to take the Attack action, the beast makes **two attacks**, or takes its **Multiattack** action if it has one.'
				},
				{
					name: 'Share Spells',
					levels: [15],
					body: 'A spell you cast **targeting yourself** can also affect your companion if it is within **30 feet**.'
				}
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
				{
					name: 'Wild Magic Surge',
					levels: [1],
					body: [
						'**Once per turn**, immediately after you cast a **sorcerer spell of 1st level or higher**, the DM may have you **roll a d20**. On a **1**, roll on the **Wild Magic Surge table** for a random magical effect.',
						'',
						'If the effect is a spell, it is **too wild for your Metamagic**, and if it would normally need concentration it **does not** here — it simply runs its full duration.',
						'',
						'| d100 | Effect |',
						'| --- | --- |',
						'| 01-02 | Roll on this table again at the **start of each of your turns for 1 minute**, ignoring this result if it comes up again. |',
						'| 03-04 | For **1 minute**, you see any **invisible creature** you have line of sight to. |',
						'| 05-06 | A **modron** the DM controls appears in a free space **within 5 feet**, gone **1 minute** later. |',
						'| 07-08 | You cast **Fireball as a 3rd-level spell**, centred on yourself. |',
						'| 09-10 | You cast **Magic Missile as a 5th-level spell**. |',
						'| 11-12 | Roll a **d10**: your **height** changes by that many inches. **Odd shrinks, even grows.** |',
						'| 13-14 | You cast **Confusion** centred on yourself. |',
						'| 15-16 | For **1 minute**, you **regain 5 hit points at the start of each of your turns**. |',
						'| 17-18 | A long **beard of feathers** grows, staying until you **sneeze** and it bursts off your face. |',
						'| 19-20 | You cast **Grease** centred on yourself. |',
						'| 21-22 | The **next spell you cast within 1 minute that calls for a saving throw** is rolled against at **disadvantage**. |',
						'| 23-24 | Your **skin turns vibrant blue**. **Remove Curse** ends it. |',
						'| 25-26 | An **eye opens on your forehead** for **1 minute**: **advantage on sight-based Wisdom (Perception) checks**. |',
						'| 27-28 | For **1 minute**, every spell of yours with a **1-action casting time takes 1 bonus action** instead. |',
						'| 29-30 | **Teleport up to 60 feet** to a free space you can see. |',
						'| 31-32 | You are **sent to the Astral Plane until the end of your next turn**, then return to your space or the nearest free one. |',
						'| 33-34 | **Maximise the damage** of the next damaging spell you cast **within 1 minute**. |',
						'| 35-36 | Roll a **d10**: your **age** changes by that many years. **Odd younger** (minimum 1 year old), **even older**. |',
						'| 37-38 | **1d6 flumphs** the DM controls appear in free spaces **within 60 feet**, **frightened of you**, gone after **1 minute**. |',
						'| 39-40 | You **regain 2d10 hit points**. |',
						'| 41-42 | You become a **potted plant until the start of your next turn** — **incapacitated** and **vulnerable to all damage**. Reaching **0 hit points** breaks the pot and returns your form. |',
						'| 43-44 | For **1 minute**, **bonus action to teleport up to 20 feet** on each of your turns. |',
						'| 45-46 | You cast **Levitate** on yourself. |',
						'| 47-48 | A **unicorn** the DM controls appears **within 5 feet**, gone **1 minute** later. |',
						'| 49-50 | For **1 minute** you **cannot speak** — **pink bubbles** float out whenever you try. |',
						'| 51-52 | A **spectral shield** guards you for **1 minute**: **+2 AC** and **immunity to Magic Missile**. |',
						'| 53-54 | **Alcohol cannot intoxicate you** for **5d6 days**. |',
						'| 55-56 | Your **hair falls out**, growing back within **24 hours**. |',
						'| 57-58 | For **1 minute**, any **flammable object you touch bursts into flame** — unless another creature wears or carries it. |',
						'| 59-60 | You **regain your lowest-level expended spell slot**. |',
						'| 61-62 | For **1 minute**, you must **shout to speak**. |',
						'| 63-64 | You cast **Fog Cloud** centred on yourself. |',
						'| 65-66 | **Up to three creatures** of your choice **within 30 feet** take **4d10 lightning damage**. |',
						'| 67-68 | You are **frightened by the nearest creature until the end of your next turn**. |',
						'| 69-70 | Every creature **within 30 feet** turns **invisible for 1 minute**, each losing it when it **attacks or casts a spell**. |',
						'| 71-72 | **Resistance to all damage** for **1 minute**. |',
						'| 73-74 | A **random creature within 60 feet** is **poisoned for 1d4 hours**. |',
						'| 75-76 | You shed **bright light in a 30-foot radius for 1 minute**. Anything ending its turn **within 5 feet** is **blinded until the end of its next turn**. |',
						'| 77-78 | You cast **Polymorph** on yourself — **fail the save and you are a sheep** for the duration. |',
						'| 79-80 | **Illusory butterflies and flower petals** drift **within 10 feet** for **1 minute**. |',
						'| 81-82 | You **immediately take one extra action**. |',
						'| 83-84 | Every creature **within 30 feet** takes **1d10 necrotic damage**, and you **regain hit points equal to the total dealt**. |',
						'| 85-86 | You cast **Mirror Image**. |',
						'| 87-88 | You cast **Fly** on a **random creature within 60 feet**. |',
						'| 89-90 | You turn **invisible for 1 minute** and **cannot be heard**, ending it if you **attack or cast a spell**. |',
						'| 91-92 | **Die within 1 minute** and you **return to life at once as though by Reincarnate**. |',
						'| 93-94 | You grow **one size category larger for 1 minute**. |',
						'| 95-96 | You and every creature **within 30 feet** gain **vulnerability to piercing damage** for **1 minute**. |',
						'| 97-98 | Faint **ethereal music** surrounds you for **1 minute**. |',
						'| 99-00 | You **regain all expended sorcery points**. |'
					].join('\n')
				},
				{
					name: 'Tides of Chaos',
					levels: [1],
					body: '**Advantage on one attack roll, ability check or saving throw**, then spent until you finish a **long rest**. Before it comes back, the DM may have you **roll on the Wild Magic Surge table** after you cast a sorcerer spell of 1st level or higher — doing so **returns the use to you**.'
				},
				{
					name: 'Bend Luck',
					levels: [6],
					body: '**Reaction** and **2 sorcery points** when another creature you can see makes an **attack roll, ability check or saving throw**: roll **1d4** and apply it as a **bonus or penalty**, your choice. You may do this **after the roll but before its effects**.'
				},
				{
					name: 'Controlled Chaos',
					levels: [14],
					body: 'Whenever you roll on the **Wild Magic Surge table**, **roll twice and use either result**.'
				},
				{
					name: 'Spell Bombardment',
					levels: [18],
					body: 'When you roll a spell’s damage and any die comes up **its highest possible number**, pick one of those dice, **roll it again** and add it to the damage. **Once per turn.**'
				}
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
				{
					name: 'Arcane Archer Lore',
					levels: [3],
					body: 'Proficiency in **Arcana or Nature**, and the **Prestidigitation or Druidcraft** cantrip.'
				},
				{
					name: 'Arcane Shot',
					levels: [3, 7, 10, 15, 18],
					choose: picks([3, 2], [7, 3], [10, 4], [15, 5], [18, 6]),
					body: [
						'**Two options** to start, **one more at 7th, 10th, 15th and 18th level**, and **every option improves at 18th level**.',
						'',
						'**Once per turn**, when you fire an arrow from a **shortbow or longbow** as part of the Attack action, apply one option to that arrow. You decide **when the arrow hits**, unless the option involves no attack roll. **Two uses**, refilled on a **short or long rest**.',
						'',
						'**Arcane Shot save DC** = 8 + your proficiency bonus + **your Intelligence modifier**.'
					].join('\n'),
					options: [
						{
							label: 'Banishing Arrow (abjuration)',
							body: '**Charisma save** or **banished to the Feywild**: **speed 0 and incapacitated** until the **end of its next turn**, when it reappears in the space it left or the nearest free one. **At 18th level** the arrow also deals **2d6 force**.'
						},
						{
							label: 'Beguiling Arrow (enchantment)',
							body: '**Extra 2d6 psychic** (**4d6 at 18th level**), and **Wisdom save** or **charmed by an ally of your choice within 30 feet** of it until the start of your next turn. Ends early if that ally attacks it, damages it, or forces it to save.'
						},
						{
							label: 'Bursting Arrow (evocation)',
							body: 'The target **and every creature within 10 feet of it** take **2d6 force** (**4d6 at 18th level**).'
						},
						{
							label: 'Enfeebling Arrow (necromancy)',
							body: '**Extra 2d6 necrotic** (**4d6 at 18th level**), and **Constitution save** or the **damage of its weapon attacks is halved** until the start of your next turn.'
						},
						{
							label: 'Grasping Arrow (conjuration)',
							body: '**Extra 2d6 poison** (**4d6 at 18th level**), **speed reduced by 10 feet**, and **2d6 slashing** (**4d6 at 18th level**) the **first time each turn** it moves 1 foot or more without teleporting. Lasts **1 minute** or until you use this option again; the target or a creature that can reach it can spend an **action** to tear the brambles off with a **Strength (Athletics)** check against your save DC.'
						},
						{
							label: 'Piercing Arrow (transmutation)',
							body: '**No attack roll.** The arrow flies down a **1-foot wide, 30-foot line**, passing through objects and **ignoring cover**. **Dexterity save** or take the arrow’s damage **plus 1d6 piercing** (**2d6 at 18th level**), half as much on a success.'
						},
						{
							label: 'Seeking Arrow (divination)',
							body: '**No attack roll.** Name **one creature you have seen in the past minute**; the arrow rounds corners and **ignores half and three-quarters cover**. If it is within range and a path exists: **Dexterity save** or take the arrow’s damage **plus 1d6 force** (**2d6 at 18th level**) and **you learn where it is**. On a success, half damage and no location.'
						},
						{
							label: 'Shadow Arrow (illusion)',
							body: '**Extra 2d6 psychic** (**4d6 at 18th level**), and **Wisdom save** or it **cannot see anything more than 5 feet away** until the start of your next turn.'
						}
					]
				},
				{
					name: 'Magic Arrow',
					levels: [7],
					body: 'Nonmagical arrows you fire from a **shortbow or longbow** count as **magical** for overcoming resistance and immunity to nonmagical attacks and damage. The magic fades the moment the arrow hits or misses.'
				},
				{
					name: 'Curving Shot',
					levels: [7],
					body: 'Miss with a **magic arrow** and you can spend a **bonus action** to **reroll the attack against a different target within 60 feet** of the original.'
				},
				{
					name: 'Ever-Ready Shot',
					levels: [15],
					body: 'Roll initiative with **no Arcane Shot uses left** and you **regain one**.'
				}
			]
		},
		{
			name: 'Cavalier',
			features: [
				{
					name: 'Bonus Proficiency',
					levels: [3],
					body: 'Proficiency in **Animal Handling, History, Insight, Performance or Persuasion**, or **one language** instead.'
				},
				{
					name: 'Born to the Saddle',
					levels: [3],
					body: '**Advantage on saving throws to avoid falling off your mount**, and a fall of **10 feet or less** lands you on your feet unless you are incapacitated. **Mounting or dismounting costs 5 feet** of movement rather than half your speed.'
				},
				{
					name: 'Unwavering Mark',
					levels: [3],
					body: [
						'Hit with a **melee weapon attack** and you can **mark** that creature until the end of your next turn. The mark ends early if you are incapacitated or die, or if someone else marks it.',
						'',
						'- While it is **within 5 feet of you**, it has **disadvantage on any attack roll that does not target you**',
						'- If it **deals damage to anyone but you**, you can make a **special melee weapon attack** against it as a **bonus action on your next turn**, **with advantage**, dealing **extra damage equal to half your fighter level** on a hit',
						'',
						'However many creatures you mark, that special attack has uses equal to your **Strength modifier** (minimum 1), refilled on a long rest.'
					].join('\n')
				},
				{
					name: 'Warding Maneuver',
					levels: [7],
					body: '**Reaction** when you or a creature you can see within 5 feet is hit, while you wield a **melee weapon or a shield**: roll **1d8** and **add it to the target’s AC** against that attack. If the attack still hits, the target has **resistance to its damage**. Uses equal to your **Constitution modifier** (minimum 1), refilled on a long rest.'
				},
				{
					name: 'Hold the Line',
					levels: [10],
					body: 'Creatures **provoke an opportunity attack from you when they move 5 feet or more while within your reach**, and a hit **reduces the target’s speed to 0** until the end of that turn.'
				},
				{
					name: 'Ferocious Charger',
					levels: [15],
					body: 'Move **at least 10 feet in a straight line** immediately before attacking, and on a hit the target makes a **Strength save** (DC 8 + your proficiency bonus + your Strength modifier) or is **knocked prone**. Once on each of your turns.'
				},
				{
					name: 'Vigilant Defender',
					levels: [18],
					body: 'A **special reaction on every creature’s turn except your own**, usable only to make an **opportunity attack**, and not on a turn you have already used your normal reaction.'
				}
			]
		},
		{
			name: 'Samurai',
			features: [
				{
					name: 'Bonus Proficiency',
					levels: [3],
					body: 'Proficiency in **History, Insight, Performance or Persuasion**, or **one language** instead.'
				},
				{
					name: 'Fighting Spirit',
					levels: [3, 10, 15],
					body: '**Bonus action:** **advantage on all weapon attack rolls** until the end of the turn, plus **5 temporary hit points** — **10 at 10th level**, **15 at 15th**. **Three uses**, refilled on a long rest.'
				},
				{
					name: 'Elegant Courtier',
					levels: [7],
					body: 'Add **your Wisdom modifier** to every **Charisma (Persuasion)** check, and gain proficiency in **Wisdom saving throws** — or **Intelligence or Charisma** (your choice) if you already have it.'
				},
				{
					name: 'Tireless Spirit',
					levels: [10],
					body: 'Roll initiative with **no Fighting Spirit uses left** and you **regain one**.'
				},
				{
					name: 'Rapid Strike',
					levels: [15],
					body: 'On the Attack action, **give up advantage** on one attack roll against a target to make **an extra weapon attack against it** as part of the same action. No more than once per turn.'
				},
				{
					name: 'Strength Before Death',
					levels: [18],
					body: 'When damage reduces you to **0 hit points**, **reaction** to delay falling unconscious and **take an extra turn immediately**. Damage taken during it still causes **death saving throw failures**, and three still kill you. When the turn ends you fall unconscious if you are still at 0. Once per long rest.'
				}
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
				{
					name: 'Gloom Stalker Magic',
					levels: [3],
					body: RANGER_SPELLS([
						'Disguise Self',
						'Rope Trick',
						'Fear',
						'Greater Invisibility',
						'Seeming'
					])
				},
				{
					name: 'Dread Ambusher',
					levels: [3],
					body: [
						'Add your **Wisdom modifier to initiative**.',
						'',
						'On your **first turn of each combat**, your walking speed increases by **10 feet** for that turn, and if you take the Attack action you make **one extra weapon attack**. That attack, on a hit, deals **an extra 1d8** of the weapon’s damage type.'
					].join('\n')
				},
				{
					name: 'Umbral Sight',
					levels: [3],
					body: '**Darkvision 60 feet**, or **+30 feet** if you already had it. While in darkness you are **invisible to any creature relying on darkvision** to see you there.'
				},
				{
					name: 'Iron Mind',
					levels: [7],
					body: 'Proficiency in **Wisdom saving throws** — or **Intelligence or Charisma** (your choice) if you already have it.'
				},
				{
					name: "Stalker's Flurry",
					levels: [11],
					body: '**Once on each of your turns**, when you miss with a weapon attack, make **another weapon attack** as part of the same action.'
				},
				{
					name: 'Shadowy Dodge',
					levels: [15],
					body: '**Reaction** to impose **disadvantage** on an attack roll against you that does not already have advantage. You must use it **before you know the outcome**.'
				}
			]
		},
		{
			name: 'Horizon Walker',
			features: [
				{
					name: 'Horizon Walker Magic',
					levels: [3],
					body: RANGER_SPELLS([
						'Protection from Evil and Good',
						'Misty Step',
						'Haste',
						'Banishment',
						'Teleportation Circle'
					])
				},
				{
					name: 'Detect Portal',
					levels: [3],
					body: '**Action:** sense the distance and direction to the nearest **planar portal within 1 mile**. Once per short or long rest.'
				},
				{
					name: 'Planar Warrior',
					levels: [3, 11],
					body: '**Bonus action:** mark a creature you can see within 30 feet. The next time you hit it **this turn** with a weapon attack, **all the attack’s damage becomes force** and it takes **an extra 1d8 force**, rising to **2d8 at 11th level**.'
				},
				{
					name: 'Ethereal Step',
					levels: [7],
					body: '**Bonus action:** cast **Etherealness** without a spell slot, but it **ends at the end of the current turn**. Once per short or long rest.'
				},
				{
					name: 'Distant Strike',
					levels: [11],
					body: 'On the Attack action, **teleport up to 10 feet before each attack** to a space you can see. Attack **two different creatures** with the action and you get **one extra attack against a third**.'
				},
				{
					name: 'Spectral Defense',
					levels: [15],
					body: '**Reaction** when you take damage from an attack: gain **resistance to all of that attack’s damage** this turn.'
				}
			]
		},
		{
			name: 'Monster Slayer',
			features: [
				{
					name: 'Monster Slayer Magic',
					levels: [3],
					body: RANGER_SPELLS([
						'Protection from Evil and Good',
						'Zone of Truth',
						'Magic Circle',
						'Banishment',
						'Hold Monster'
					])
				},
				{
					name: "Hunter's Sense",
					levels: [3],
					body: '**Action:** learn one creature within 60 feet’s **damage immunities, resistances and vulnerabilities**. A creature hidden from divination reads as having none. Uses equal to your **Wisdom modifier** (minimum 1), refilled on a long rest.'
				},
				{
					name: "Slayer's Prey",
					levels: [3],
					body: '**Bonus action:** mark one creature you can see within 60 feet. The **first time each turn** you hit it with a weapon attack it takes **an extra 1d6**. Lasts until you finish a short or long rest, or until you mark someone else.'
				},
				{
					name: 'Supernatural Defense',
					levels: [7],
					body: 'Add **1d6** whenever your **Slayer’s Prey** target forces you to make a saving throw, and to ability checks to escape its grapple.'
				},
				{
					name: "Magic-User's Nemesis",
					levels: [11],
					body: '**Reaction** when you see a creature within 60 feet **casting a spell or teleporting**: **Wisdom save** against your spell save DC or the spell or teleport **fails and is wasted**. Once per short or long rest.'
				},
				{
					name: "Slayer's Counter",
					levels: [15],
					body: 'When your **Slayer’s Prey** target forces you to make a save, **reaction** to make **one weapon attack** against it first. **If the attack hits, the save automatically succeeds.**'
				}
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
				{
					name: 'Divine Magic',
					levels: [1],
					body: [
						'Whenever your Spellcasting lets you learn a **sorcerer cantrip or spell**, you may take it from the **cleric spell list** instead. Every other restriction still applies, and the spell **becomes a sorcerer spell for you**.',
						'',
						'Choose an **affinity** for the source of your power. It grants **one extra spell** that is a sorcerer spell for you and **does not count against your spells known** — if you ever replace it, the replacement must come from the **cleric list**. The affinity also fixes the look of your **Angelic Form** wings.'
					].join('\n'),
					options: [
						{ label: 'Good', body: '**Cure Wounds.** Eagle wings.' },
						{ label: 'Evil', body: '**Inflict Wounds.** Bat wings.' },
						{ label: 'Law', body: '**Bless.** Eagle wings.' },
						{ label: 'Chaos', body: '**Bane.** Bat wings.' },
						{
							label: 'Neutrality',
							body: '**Protection from Evil and Good.** Dragonfly wings.'
						}
					]
				},
				{
					name: 'Favored by the Gods',
					levels: [1],
					body: 'When you **fail a saving throw or miss with an attack roll**, roll **2d4** and add it to the total — possibly turning the failure into a success. Once per **short or long rest**.'
				},
				{
					name: 'Empowered Healing',
					levels: [6],
					body: 'When **you or an ally within 5 feet** rolls dice for the **hit points a spell restores**, spend **1 sorcery point** to **reroll any number of those dice once**. You must not be incapacitated, and you can do this **only once per turn**.'
				},
				{
					name: 'Angelic Form',
					levels: [14],
					body: '**Bonus action:** spectral wings, **flying speed 30 feet**. They last until you are **incapacitated**, you die, or you dismiss them as a **bonus action**. Their shape follows your **Divine Magic affinity**.'
				},
				{
					name: 'Unearthly Recovery',
					levels: [18],
					body: '**Bonus action** while you have **fewer than half your hit points**: regain **hit points equal to half your hit point maximum**. Once per **long rest**.'
				}
			]
		},
		{
			name: 'Shadow Magic',
			features: [
				{
					name: 'Eyes of the Dark',
					levels: [1, 3],
					body: [
						'**Darkvision 120 feet.**',
						'',
						'At **3rd level** you learn **Darkness**, which **does not count against your spells known**. You may cast it with a spell slot or for **2 sorcery points** — and if you pay the sorcery points, **you can see through the darkness it creates**.'
					].join('\n')
				},
				{
					name: 'Strength of the Grave',
					levels: [1],
					body: 'When damage would reduce you to **0 hit points**, make a **Charisma saving throw against DC 5 + the damage taken**. On a success you **drop to 1 hit point** instead. **Not available against radiant damage or a critical hit.** Once it succeeds, it is spent until you finish a **long rest**.'
				},
				{
					name: 'Hound of Ill Omen',
					levels: [6],
					body: [
						'**Bonus action** and **3 sorcery points:** summon a hound to hunt one creature you can see **within 120 feet**. It appears in a free space **within 30 feet of the target**, uses the **dire wolf**’s statistics, and **rolls its own initiative**.',
						'',
						'- **Medium monstrosity**, not a Large beast',
						'- **Temporary hit points equal to half your sorcerer level**',
						'- Moves through creatures and objects as **difficult terrain**, taking **5 force damage** if it ends its turn inside one',
						'- At the start of its turn it **automatically knows where its target is**, even if hidden',
						'',
						'It may **only move toward its target by the shortest route** and may **only attack that target**, including with opportunity attacks. While it is **within 5 feet of the target, that target has disadvantage on saving throws against your spells**.',
						'',
						'It vanishes at **0 hit points**, when its **target drops to 0**, or after **5 minutes**.'
					].join('\n')
				},
				{
					name: 'Shadow Walk',
					levels: [14],
					body: '**Bonus action** while you are in **dim light or darkness:** teleport **up to 120 feet** to a free space you can see that is **also in dim light or darkness**.'
				},
				{
					name: 'Umbral Form',
					levels: [18],
					body: '**Bonus action** and **6 sorcery points:** for **1 minute** you gain **resistance to all damage except force and radiant**, and you move through creatures and objects as **difficult terrain**, taking **5 force damage** if you end your turn inside one. It ends early if you are **incapacitated**, you die, or you dismiss it as a **bonus action**.'
				}
			]
		},
		{
			name: 'Storm Sorcery',
			features: [
				{
					name: 'Wind Speaker',
					levels: [1],
					body: 'You **speak, read and write Primordial** — and so understand and are understood in its dialects: **Aquan, Auran, Ignan and Terran**.'
				},
				{
					name: 'Tempestuous Magic',
					levels: [1],
					body: '**Bonus action** immediately **before or after you cast a spell of 1st level or higher:** **fly up to 10 feet without provoking opportunity attacks**.'
				},
				{
					name: 'Heart of the Storm',
					levels: [6],
					body: 'Resistance to **lightning and thunder damage**. Whenever you **start casting a spell of 1st level or higher that deals lightning or thunder damage**, creatures of your choice that you can see **within 10 feet** take **lightning or thunder damage (your pick each time) equal to half your sorcerer level**.'
				},
				{
					name: 'Storm Guide',
					levels: [6],
					body: [
						'- **In rain — action:** stop the rain falling in a **20-foot-radius sphere** centred on you; end it as a **bonus action**.',
						'- **In wind — bonus action each round:** set the wind’s direction in a **100-foot-radius sphere** centred on you until the end of your next turn. **Its speed is unchanged.**'
					].join('\n')
				},
				{
					name: "Storm's Fury",
					levels: [14],
					body: '**Reaction** when a **melee attack hits you:** the attacker takes **lightning damage equal to your sorcerer level** and makes a **Strength saving throw** against your spell save DC, being **pushed up to 20 feet straight away from you** on a failure.'
				},
				{
					name: 'Wind Soul',
					levels: [18],
					body: [
						'**Immunity to lightning and thunder damage**, and a magical **flying speed of 60 feet**.',
						'',
						'**Action:** trade that down to **30 feet for 1 hour** to give a magical **flying speed of 30 feet for 1 hour** to **3 + your Charisma modifier** creatures within 30 feet of you. Once per **short or long rest**.'
					].join('\n')
				}
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
				{
					name: 'Psionic Power',
					levels: [3, 5, 11, 17],
					body: [
						'**Psionic Energy dice** are **d6s**, and you have a number of them equal to **twice your proficiency bonus**. They grow to **d8 at 5th level**, **d10 at 11th** and **d12 at 17th**. All of them return on a **long rest**, and a **bonus action** brings **one** back, once per short or long rest. A power that expends a die is unusable once they are all spent.',
						'',
						'- **Protective Field.** **Reaction** when you or a creature you can see within 30 feet takes damage: expend a die and **reduce that damage by the roll + your Intelligence modifier** (minimum 1)',
						'- **Psionic Strike.** **Once on each of your turns**, right after you hit and damage a target within 30 feet with a weapon: expend a die for **extra force damage equal to the roll + your Intelligence modifier**',
						'- **Telekinetic Movement.** **Action:** move one **Large or smaller loose object**, or one **willing creature** other than yourself, that you can see within 30 feet **up to 30 feet** to an unoccupied space you can see — or a **Tiny object** to or from your hand. Once per short or long rest, or again by **expending a die**'
					].join('\n')
				},
				{
					name: 'Telekinetic Adept',
					levels: [7],
					body: [
						'- **Psi-Powered Leap.** **Bonus action:** a **flying speed of twice your walking speed** until the end of the turn. Once per short or long rest, or again by **expending a die**',
						'- **Telekinetic Thrust.** When **Psionic Strike** damages a target, it makes a **Strength save** (DC 8 + your proficiency bonus + your Intelligence modifier) or you **knock it prone or move it 10 feet** in any horizontal direction'
					].join('\n')
				},
				{
					name: 'Guarded Mind',
					levels: [10],
					body: '**Resistance to psychic damage.** Start your turn **charmed or frightened** and you can **expend a Psionic Energy die to end every effect** subjecting you to those conditions.'
				},
				{
					name: 'Bulwark of Force',
					levels: [15],
					body: '**Bonus action:** creatures you can see within 30 feet, up to **your Intelligence modifier** in number (minimum 1) and possibly including you, gain **half cover for 1 minute** or until you are incapacitated. Once per long rest, or again by **expending a die**.'
				},
				{
					name: 'Telekinetic Master',
					levels: [18],
					body: 'Cast **Telekinesis** with **no components**, using **Intelligence**. On each turn you concentrate on it, including the turn you cast it, you can make **one weapon attack as a bonus action**. Once per long rest, or again by **expending a die**.'
				}
			]
		},
		{
			name: 'Rune Knight',
			features: [
				{
					name: 'Bonus Proficiencies',
					levels: [3],
					body: 'Proficiency with **smith’s tools**, and you speak, read and write **Giant**.'
				},
				{
					name: 'Rune Carver',
					levels: [3, 7, 10, 15],
					choose: picks([3, 2], [7, 3], [10, 4], [15, 5]),
					body: '**Two runes** known, **three at 7th level**, **four at 10th**, **five at 15th**, and you may **swap one** each fighter level. On each **long rest** you touch that many objects and inscribe **a different rune on each** — a weapon, armour, a shield, jewellery, anything you can wear or hold. A rune lasts **until your next long rest**, and **an object carries only one of yours** at a time. **Rune Magic save DC** = 8 + your proficiency bonus + **your Constitution modifier**. Each rune can be **invoked once per short or long rest**.',
					options: [
						{
							label: 'Cloud Rune',
							body: 'While worn or carried: **advantage on Dexterity (Sleight of Hand) and Charisma (Deception)** checks. **Invoke as a reaction** when you or a creature you can see within 30 feet is hit by an attack roll: **a different creature within 30 feet of you**, other than the attacker, **becomes the target instead**, using the same roll, whatever the attack’s range.'
						},
						{
							label: 'Fire Rune',
							body: 'While worn or carried: your **proficiency bonus is doubled** on any ability check using a **tool** you are proficient with. **Invoke** when you hit with a weapon: **extra 2d6 fire**, and a **Strength save** or **restrained for 1 minute**, taking **2d6 fire at the start of each of its turns** and repeating the save at the end of each to shed the shackles.'
						},
						{
							label: 'Frost Rune',
							body: 'While worn or carried: **advantage on Wisdom (Animal Handling) and Charisma (Intimidation)** checks. **Invoke as a bonus action** for **+2 to all ability checks and saving throws using Strength or Constitution**, for 10 minutes.'
						},
						{
							label: 'Stone Rune',
							body: 'While worn or carried: **advantage on Wisdom (Insight)** checks and **darkvision out to 120 feet**. **Invoke as a reaction** when a creature you can see **ends its turn within 30 feet**: **Wisdom save** or **charmed by you for 1 minute** with **speed 0 and incapacitated**, repeating the save at the end of each of its turns.'
						},
						{
							label: 'Hill Rune (7th level)',
							body: 'While worn or carried: **advantage on saving throws against being poisoned** and **resistance to poison damage**. **Invoke as a bonus action** for **resistance to bludgeoning, piercing and slashing damage**, for 1 minute.'
						},
						{
							label: 'Storm Rune (7th level)',
							body: 'While worn or carried: **advantage on Intelligence (Arcana)** checks, and **you cannot be surprised** while you are not incapacitated. **Invoke as a bonus action** for a **prophetic state** lasting 1 minute or until you are incapacitated: **reaction** to give **advantage or disadvantage** to any attack roll, saving throw or ability check made by you or a creature you can see within 60 feet.'
						}
					]
				},
				{
					name: "Giant's Might",
					levels: [3],
					body: '**Bonus action**, 1 minute: you become **Large** if you were smaller and have the room, you have **advantage on Strength checks and Strength saving throws**, and **once on each of your turns** one attack with a weapon or an unarmed strike deals **an extra 1d6** on a hit. Uses equal to your **proficiency bonus**, refilled on a long rest.'
				},
				{
					name: 'Runic Shield',
					levels: [7],
					body: '**Reaction** when another creature you can see within 60 feet is hit by an attack roll: the **attacker rerolls the d20** and must use the new roll. Uses equal to your **proficiency bonus**, refilled on a long rest.'
				},
				{
					name: 'Great Stature',
					levels: [10],
					body: 'Roll **3d4** and **grow that many inches** taller, permanently. **Giant’s Might** now deals **1d8** extra damage.'
				},
				{
					name: 'Master of Runes',
					levels: [15],
					body: 'Each rune you know can be **invoked twice** rather than once, refilled on a **short or long rest**.'
				},
				{
					name: 'Runic Juggernaut',
					levels: [18],
					body: '**Giant’s Might** deals **1d10** extra damage, its size increase can take you to **Huge**, and while you are that size **your reach grows by 5 feet**.'
				}
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
				{
					name: 'Dreadful Strikes',
					levels: [3, 11],
					body: 'On hitting a creature with a weapon, deal **an extra 1d4 psychic**, **once per turn per target**. Rises to **1d6 at 11th level**.'
				},
				{
					name: 'Fey Wanderer Magic',
					levels: [3],
					body: [
						RANGER_SPELLS([
							'Charm Person',
							'Misty Step',
							'Dispel Magic',
							'Dimension Door',
							'Mislead'
						]),
						'',
						'You also carry a **Feywild gift** — purely cosmetic, rolled on a d6 or chosen: illusory butterflies at rest, seasonal flowers in your hair, a comforting scent, a shadow that dances unobserved, horns or antlers, or hair and skin that recolour with the season.'
					].join('\n')
				},
				{
					name: 'Otherworldly Glamour',
					levels: [3],
					body: 'Add your **Wisdom modifier** (minimum +1) to **every Charisma check**, and gain proficiency in **Deception, Performance or Persuasion**.'
				},
				{
					name: 'Beguiling Twist',
					levels: [7],
					body: [
						'**Advantage on saves against being charmed or frightened.**',
						'',
						'**Reaction** whenever you or a creature you can see within 120 feet **succeeds** on such a save: a different creature you can see within 120 feet makes a **Wisdom save** against your spell save DC or is **charmed or frightened by you** (your choice) for 1 minute, repeating the save at the end of each of its turns.'
					].join('\n')
				},
				{
					name: 'Fey Reinforcements',
					levels: [11],
					body: 'You know **Summon Fey**; it does not count against your spells known and needs **no material component**. Once per long rest you can cast it **without a spell slot**. You may also cast it **without concentration**, in which case its duration becomes **1 minute**.'
				},
				{
					name: 'Misty Wanderer',
					levels: [15],
					body: 'Cast **Misty Step without a slot**, uses equal to your **Wisdom modifier** (minimum 1), refilled on a long rest. Any Misty Step you cast can **bring one willing creature** within 5 feet along, landing them within 5 feet of you.'
				}
			]
		},
		{
			name: 'Swarmkeeper',
			features: [
				{
					name: 'Gathered Swarm',
					levels: [3],
					body: [
						'Intangible nature spirits share your space — insects, twig blights, birds or pixies, your choice.',
						'',
						'**Once on each of your turns**, immediately after you hit with an attack, the swarm does one of:',
						'',
						'- The target takes **1d6 piercing**',
						'- The target makes a **Strength save** against your spell save DC or is **moved up to 15 feet horizontally**',
						'- **You** are moved **5 feet horizontally**'
					].join('\n')
				},
				{
					name: 'Swarmkeeper Magic',
					levels: [3],
					body: [
						'You learn **Mage Hand** if you do not know it; the hand appears as your swarm.',
						'',
						RANGER_SPELLS([
							'Faerie Fire, Mage Hand',
							'Web',
							'Gaseous Form',
							'Arcane Eye',
							'Insect Plague'
						])
					].join('\n')
				},
				{
					name: 'Writhing Tide',
					levels: [7],
					body: '**Bonus action:** gain a **flying speed of 10 feet with hovering** for 1 minute, or until incapacitated. Uses equal to your **proficiency bonus**, refilled on a long rest.'
				},
				{
					name: 'Mighty Swarm',
					levels: [11],
					body: [
						'- Gathered Swarm damage rises to **1d8**',
						'- A creature that **fails** the save to be moved can also be **knocked prone**',
						'- When the swarm moves **you**, you gain **half cover** until the start of your next turn'
					].join('\n')
				},
				{
					name: 'Swarming Dispersal',
					levels: [15],
					body: '**Reaction** when you take damage: gain **resistance to that damage** and **teleport** to an unoccupied space you can see within **30 feet**. Uses equal to your **proficiency bonus**, refilled on a long rest.'
				}
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
				{
					name: 'Psionic Spells',
					levels: [1],
					body: spellLadder(
						'Sorcerer',
						'Each counts as a sorcerer spell for you, but does not count against the number you know. On any sorcerer level you may **swap one of them for another divination or enchantment spell** from the **sorcerer, warlock or wizard** list of the same level.',
						[
							'Arms of Hadar, Dissonant Whispers, Mind Sliver',
							'Calm Emotions, Detect Thoughts',
							'Hunger of Hadar, Sending',
							'Evard’s Black Tentacles, Summon Aberration',
							'Rary’s Telepathic Bond, Telekinesis'
						],
						['1st', '3rd', '5th', '7th', '9th']
					)
				},
				{
					name: 'Telepathic Speech',
					levels: [1],
					body: '**Bonus action:** link minds with one creature you can see **within 30 feet**. The two of you can **speak telepathically** while within **a number of miles equal to your Charisma modifier** (minimum 1), each of you using a language the other knows. It lasts **minutes equal to your sorcerer level**, ending early if you are **incapacitated**, you die, or you link with **someone else**.'
				},
				{
					name: 'Psionic Sorcery',
					levels: [6],
					body: 'When you cast a spell of **1st level or higher from Psionic Spells**, you may pay **sorcery points equal to its level** instead of a spell slot. Cast that way it needs **no verbal, somatic or material components** — unless the spell **consumes** the material.'
				},
				{
					name: 'Psychic Defenses',
					levels: [6],
					body: '**Resistance to psychic damage**, and **advantage on saving throws against being charmed or frightened**.'
				},
				{
					name: 'Revelation in Flesh',
					levels: [14],
					body: [
						'**Bonus action** and **1 or more sorcery points:** your body transforms for **10 minutes**. **Each point buys one benefit below**, and each lasts until the transformation ends.',
						'',
						'- **See any invisible creature within 60 feet**, so long as it is not behind total cover',
						'- **Flying speed equal to your walking speed**, and you can **hover**',
						'- **Swimming speed twice your walking speed**, and you **breathe underwater**',
						'- You and your gear turn pliable: **move through any gap as narrow as 1 inch without squeezing**, and spend **5 feet of movement to escape nonmagical restraints or a grapple**'
					].join('\n')
				},
				{
					name: 'Warping Implosion',
					levels: [18],
					body: '**Action:** teleport to a free space you can see **within 120 feet**. Every creature **within 30 feet of the space you left** makes a **Strength saving throw** against your spell save DC, taking **3d10 force damage** and being **pulled to the nearest free space to where you stood** on a failure, or **half damage and no pull** on a success. Once per **long rest**, or again for **5 sorcery points**.'
				}
			]
		},
		{
			name: 'Clockwork Soul',
			features: [
				{
					name: 'Clockwork Magic',
					levels: [1],
					body: spellLadder(
						'Sorcerer',
						'Each counts as a sorcerer spell for you, but does not count against the number you know. On any sorcerer level you may **swap one of them for another abjuration or transmutation spell** from the **sorcerer, warlock or wizard** list of the same level.',
						[
							'Alarm, Protection from Evil and Good',
							'Aid, Lesser Restoration',
							'Dispel Magic, Protection from Energy',
							'Freedom of Movement, Summon Construct',
							'Greater Restoration, Wall of Force'
						],
						['1st', '3rd', '5th', '7th', '9th']
					)
				},
				{
					name: 'Restore Balance',
					levels: [1],
					body: '**Reaction** when a creature you can see **within 60 feet** is about to roll a d20 **with advantage or disadvantage:** the roll is made **as a plain d20 instead**, neither applying. Uses equal to your **proficiency bonus**, all back on a **long rest**.'
				},
				{
					name: 'Bastion of Law',
					levels: [6],
					body: '**Action** and **1 to 5 sorcery points:** ward yourself or a creature you can see **within 30 feet** with **that many d8s**. When the warded creature takes damage it may **spend any number of those dice and reduce the damage by the total rolled**. The ward lasts until your next **long rest** or until you use this again.'
				},
				{
					name: 'Trance of Order',
					levels: [14],
					body: '**Bonus action:** for **1 minute**, **attack rolls against you cannot have advantage**, and on your own **attack rolls, ability checks and saving throws** you **treat a d20 of 9 or lower as a 10**. Once per **long rest**, or again for **5 sorcery points**.'
				},
				{
					name: 'Clockwork Cavalcade',
					levels: [18],
					body: [
						'**Action:** spirits of order fill a **30-foot cube originating from you**, act, and vanish.',
						'',
						'- **Restore up to 100 hit points**, split however you like among creatures of your choice in the cube',
						'- **Repair every damaged object entirely inside** it',
						'- **End every spell of 6th level or lower** on creatures and objects of your choice there',
						'',
						'Once per **long rest**, or again for **7 sorcery points**.'
					].join('\n')
				}
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
	fighter: [
		{
			name: 'Banneret',
			source: "Sword Coast Adventurer's Guide",
			features: [
				{
					name: 'Rallying Cry',
					levels: [3],
					body: 'When you use **Second Wind**, up to **three allied creatures within 60 feet** that can **see or hear you** each regain **hit points equal to your fighter level**.'
				},
				{
					name: 'Royal Envoy',
					levels: [7],
					body: 'Proficiency in **Persuasion**, or in **Animal Handling, Insight, Intimidation or Performance** if you already have it. Either way, your **proficiency bonus is doubled on any ability check that uses Persuasion**.'
				},
				{
					name: 'Inspiring Surge',
					levels: [10, 18],
					body: 'When you use **Action Surge**, one **allied creature within 60 feet** that can see or hear you makes **one melee or ranged weapon attack with its reaction**. **Two allies at 18th level.**'
				},
				{
					name: 'Bulwark',
					levels: [15],
					body: 'When you use **Indomitable** to reroll an **Intelligence, Wisdom or Charisma saving throw** and you are not incapacitated, one **ally within 60 feet** that failed **the same** saving throw and can see or hear you **rerolls as well**, and must use the new roll.'
				}
			]
		},
		{
			name: 'Echo Knight',
			source: "Explorer's Guide to Wildemount",
			features: [
				{
					name: 'Manifest Echo',
					levels: [3],
					body: [
						'**Bonus action:** an echo of you appears in an unoccupied space you can see **within 15 feet**. It has **AC 14 + your proficiency bonus**, **1 hit point**, **immunity to all conditions**, and **your saving throw bonuses**. It is your size and occupies its space. It lasts until destroyed, until you dismiss it (**bonus action**), until you manifest another, or until you are incapacitated.',
						'',
						'On your turn you can **mentally move it up to 30 feet** in any direction, no action required. It is **destroyed if it ends your turn more than 30 feet from you**.',
						'',
						'- **Bonus action:** **swap places with it** for **15 feet of your movement**, at any distance',
						'- Attacks made with the **Attack action** may **originate from its space**, chosen per attack',
						'- **Reaction:** when a creature you can see within 5 feet of the echo **moves at least 5 feet away from it**, make an **opportunity attack as though you stood in the echo’s space**'
					].join('\n')
				},
				{
					name: 'Unleash Incarnation',
					levels: [3],
					body: 'Whenever you take the Attack action, **one extra melee attack from the echo’s position**. Uses equal to your **Constitution modifier** (minimum 1), refilled on a long rest.'
				},
				{
					name: 'Echo Avatar',
					levels: [7],
					body: '**Action:** see and hear through the echo for up to **10 minutes**, **blinded and deafened** yourself meanwhile, and end it whenever you like. While it is used this way it can be **up to 1,000 feet away** without being destroyed.'
				},
				{
					name: 'Shadow Martyr',
					levels: [10],
					body: '**Reaction** before an attack roll is made against a creature you can see: **teleport the echo to a free space within 5 feet** of that creature, and the attack **is made against the echo instead**. Once per short or long rest.'
				},
				{
					name: 'Reclaim Potential',
					levels: [15],
					body: 'When an echo of yours is **destroyed by damage**, gain **2d6 + your Constitution modifier temporary hit points**, provided you have none already. Uses equal to your **Constitution modifier** (minimum 1), refilled on a long rest.'
				},
				{
					name: 'Legion of One',
					levels: [18],
					body: '**Manifest Echo** makes **two echoes that coexist** — a third destroys the earlier pair — and anything you can do from one echo’s position you can do from the other’s. Roll initiative with **no Unleash Incarnation uses left** and you **regain one**.'
				}
			]
		}
	],
	ranger: [
		{
			name: 'Drakewarden',
			source: "Fizban's Treasury of Dragons",
			features: [
				{
					name: 'Draconic Gift',
					levels: [3],
					body: 'You learn **Thaumaturgy** (a ranger spell for you), and to speak, read and write **Draconic** or one other language of your choice.'
				},
				{
					name: 'Drake Companion',
					levels: [3],
					body: [
						'**Action:** summon your drake into a space within 30 feet. It is friendly to you and obeys you, and uses your proficiency bonus (**PB**) throughout. Choose its **Draconic Essence** damage type each time you summon it: **acid, cold, fire, lightning or poison**.',
						'',
						'It shares your initiative but acts **immediately after you**. It moves and uses its reaction on its own, but its only action is **Dodge** unless you spend a **bonus action** to command another. If you are incapacitated it acts freely.',
						'',
						'It stays until reduced to 0 hit points, resummoned, or you die. **Once per long rest**, or again by spending a **spell slot of 1st level or higher**.',
						'',
						'Small dragon · **AC 14 + PB** · **HP 5 + 5 per ranger level** (d10 Hit Dice) · Speed **40 ft.** · darkvision 60 ft. · **immune to its Essence damage type** · saves **Dex +1 + PB, Wis +2 + PB**',
						'',
						'| STR | DEX | CON | INT | WIS | CHA |',
						'| --- | --- | --- | --- | --- | --- |',
						'| 16 | 12 | 15 | 8 | 14 | 8 |',
						'',
						'**Bite.** Melee attack, **+3 + PB** to hit, reach 5 ft. **1d6 + PB piercing**.',
						'',
						'**Infused Strikes (reaction).** When another creature it can see within 30 feet hits with a weapon attack, the target takes **an extra 1d6** of the drake’s Essence type.'
					].join('\n')
				},
				{
					name: 'Bond of Fang and Scale',
					levels: [7],
					body: [
						'Your summoned drake grows **wings**, gaining a flying speed equal to its walking speed. While it is summoned:',
						'',
						'- **Drake Mount.** It becomes **Medium** and can carry you if you are Medium or smaller — though it cannot use that flying speed while you ride it',
						'- **Magic Fang.** Its Bite deals **an extra 1d6** of its Essence type',
						'- **Resistance.** You gain **resistance** to its Essence damage type'
					].join('\n')
				},
				{
					name: "Drake's Breath",
					levels: [11, 15],
					body: '**Action:** you or the drake exhale a **30-foot cone**. Choose **acid, cold, fire, lightning or poison** — it need not match the drake’s Essence. **Dexterity save** against your spell save DC for **8d6**, half on a success, rising to **10d6 at 15th level**. Once per long rest, or again by spending a **spell slot of 3rd level or higher**.'
				},
				{
					name: 'Perfected Bond',
					levels: [15],
					body: [
						'While the drake is summoned:',
						'',
						'- **Empowered Bite.** Another **+1d6** of its Essence type, for **2d6** extra in total',
						'- **Large Drake.** It becomes **Large**, and can now use its flying speed while you ride it',
						'- **Reflexive Resistance.** When you or the drake takes damage within 30 feet of each other, **reaction** to give either of you **resistance to that instance**. Uses equal to your **proficiency bonus**, refilled on a long rest'
					].join('\n')
				}
			]
		}
	],
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
	],
	sorcerer: [
		{
			name: 'Lunar Sorcery',
			source: 'Dragonlance: Shadow of the Dragon Queen',
			features: [
				{
					name: 'Lunar Embodiment',
					levels: [1],
					body: [
						'Each spell below counts as a sorcerer spell for you but **does not count against the number you know**.',
						'',
						'| Sorcerer Level | Full Moon | New Moon | Crescent Moon |',
						'| --- | --- | --- | --- |',
						'| 1st | Shield | Ray of Sickness | Color Spray |',
						'| 3rd | Lesser Restoration | Blindness/Deafness | Alter Self |',
						'| 5th | Dispel Magic | Vampiric Touch | Phantom Steed |',
						'| 7th | Death Ward | Confusion | Hallucinatory Terrain |',
						'| 9th | Rary’s Telepathic Bond | Hold Monster | Mislead |',
						'',
						'On each **long rest**, pick the phase your magic runs on: **Full, New or Crescent Moon**. While in it you may cast **one 1st-level spell of that phase without a spell slot**, once, until your next long rest.'
					].join('\n')
				},
				{
					name: 'Moon Fire',
					levels: [1],
					body: 'You learn **Sacred Flame**, and it **does not count against your cantrips known**. When you cast it you may target one creature as normal, or **two creatures within 5 feet of each other**.'
				},
				{
					name: 'Lunar Boons',
					levels: [6],
					body: [
						'When you use **Metamagic** on a spell whose school matches your **current phase**, **reduce the sorcery points spent by 1** (minimum 0). Uses equal to your **proficiency bonus**, all back on a **long rest**.',
						'',
						'- **Full Moon.** Abjuration and divination',
						'- **New Moon.** Enchantment and necromancy',
						'- **Crescent Moon.** Illusion and transmutation'
					].join('\n')
				},
				{
					name: 'Waxing and Waning',
					levels: [6],
					body: '**Bonus action** and **1 sorcery point:** **change your current phase** to another. You may now cast **one 1st-level spell from each phase** without a slot — each while you are in that phase, each once per **long rest**.'
				},
				{
					name: 'Lunar Empowerment',
					levels: [14],
					body: [
						'Your current phase also gives you its standing benefit:',
						'',
						'- **Full Moon.** **Bonus action** to shed **bright light in a 10-foot radius and dim light 10 feet beyond**, or to douse it. You and creatures of your choice have **advantage on Intelligence (Investigation) and Wisdom (Perception) checks** inside that bright light.',
						'- **New Moon.** **Advantage on Dexterity (Stealth) checks**, and while you are **entirely in darkness, attack rolls against you have disadvantage**.',
						'- **Crescent Moon.** **Resistance to necrotic and radiant damage**.'
					].join('\n')
				},
				{
					name: 'Lunar Phenomenon',
					levels: [18],
					body: [
						'**Bonus action:** unleash your current phase’s power — or fold it into the **bonus action you spend on Waxing and Waning**, firing off the power of the phase you are **entering**.',
						'',
						'- **Full Moon.** Each creature of your choice **within 30 feet** makes a **Constitution saving throw** against your spell save DC or is **blinded until the end of its next turn**. One creature of your choice there also **regains 3d8 hit points**.',
						'- **New Moon.** Each creature of your choice **within 30 feet** makes a **Dexterity saving throw** or takes **3d10 necrotic damage** and has its **speed reduced to 0 until the end of its next turn**. You also turn **invisible until the end of your next turn**, or until you attack or cast a spell.',
						'- **Crescent Moon.** **Teleport** to a free space you can see **within 60 feet**, optionally bringing one willing creature within 5 feet of you along to a free space of your choice within 5 feet of where you land. You and that creature gain **resistance to all damage until the start of your next turn**.',
						'',
						'Each of these is **once per long rest** on its own, or again for **5 sorcery points**.'
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
 * subclasses sit at whatever tier they have been filled in to: some are names and levels alone,
 * others carry a restated `body` for every feature, the same as the PHB outlines above.
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
