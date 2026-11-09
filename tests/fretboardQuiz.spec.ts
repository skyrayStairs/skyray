import { test, expect } from '@playwright/test'
import { makeExercise } from '../src/lib/types/guitar'

test.beforeEach(async ({ page }) => {
	const exercise = {
		...makeExercise(0),
		kind: 'fretboard',
		timerEnabled: false,
		fretboard: {
			view: 'quiz',
			includeNotes: true,
			includeSevenths: false,
			includeTriads: false,
			quizRootString: 5,
			guessSec: 1
		}
	}
	await page.addInitScript((exercise) => {
		if (!localStorage.getItem('guitar-routines')) {
			localStorage.setItem(
				'guitar-routines',
				JSON.stringify([{ id: 'quiz', name: 'Note practice', exercises: [exercise] }])
			)
			localStorage.setItem('guitar-active-routine-id', 'quiz')
		}
	}, exercise)
	await page.clock.install()
	await page.clock.pauseAt(new Date(Date.now() + 1000))
	await page.goto('http://localhost:4173/sandbox/guitar-routine')
	await expect(page.getByLabel('Note root string')).toHaveValue('5')
})

for (const string of [6, 5, 4]) {
	test(`note quiz saves the ${string}th string and reveals its correct frets`, async ({ page }) => {
		await page.getByLabel('Note root string').selectOption(String(string))
		if (string === 4) await page.getByRole('button', { name: 'Do–Ti', exact: true }).click()
		await page.reload()
		await expect(page.getByLabel('Note root string')).toHaveValue(String(string))
		await expect(page.getByLabel('Chord root string')).toHaveValue('5')
		await page.getByRole('button', { name: '▶ Run', exact: true }).click()
		const prompt = page.getByText(new RegExp(`^.+ · ${string}th-string$`))
		await expect(prompt).toBeVisible()
		const label = (await prompt.innerText()).split(' · ')[0]
		const names =
			string === 4
				? ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti']
				: ['C', 'D', 'E', 'F', 'G', 'A', 'B']
		// Known natural-note frets in standard E/A/D tuning; D, A and E also sound open.
		const frets: Record<number, number[]> = {
			6: [8, 10, 12, 1, 3, 5, 7],
			5: [3, 5, 7, 8, 10, 12, 2],
			4: [10, 12, 2, 3, 5, 7, 9]
		}
		const fret = frets[string][names.indexOf(label)]
		expect(fret).toBeDefined()
		const board = page.getByRole('img', { name: 'fretboard diagram' })
		await expect(board.locator('text').filter({ hasText: new RegExp(`^${label}$`) })).toHaveCount(0)
		await page.clock.fastForward(1100)
		await expect(page.getByText(`Answer: ${label}`, { exact: true })).toBeVisible()
		const notes = board.locator('text').filter({ hasText: new RegExp(`^${label}$`) })
		await expect(notes).toHaveCount(fret === 12 ? 2 : 1)
		for (const note of await notes.all()) {
			await expect(note).toHaveAttribute('y', String(26 + (string - 1) * 26 + 3))
		}
		await expect(notes.last()).toHaveAttribute('x', String(26 + (fret - 1) * 38 + 19))
	})
}

test('mixed note practice draws from the 6th, 5th and 4th strings', async ({ page }) => {
	await page.getByLabel('Note root string').selectOption('all')
	await page.evaluate(() => {
		let seed = 42
		Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
	})
	await page.getByRole('button', { name: '▶ Run', exact: true }).click()
	const strings = new Set<string>()
	for (let i = 0; i < 15; i++) {
		const prompt = page.getByText(/^.+ · [654]th-string$/)
		await expect(prompt).toBeVisible()
		strings.add((await prompt.innerText()).split(' · ')[1])
		await page.clock.fastForward(1100)
		await expect(page.getByText(/^Answer:/)).toBeVisible()
		await page.clock.fastForward(5100)
	}
	expect([...strings].sort()).toEqual(['4th-string', '5th-string', '6th-string'])
})

test('saved quizzes without a note-string setting retain their selected string', async ({
	page
}) => {
	await page.getByRole('button', { name: '▶ Run', exact: true }).click()
	await expect(page.getByText(/^.+ · 5th-string$/)).toBeVisible()
})
