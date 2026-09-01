import { expect, test, type Page } from '@playwright/test';
import { createRoom, seatBots, type Table } from './table';

let table: Table | null = null;
test.afterEach(() => {
	table?.close();
	table = null;
});

/** Join a room with bots already seated, ready up and start. */
async function startGame(page: Page, baseURL: string, readingSeconds = 12) {
	const code = await createRoom(baseURL);
	await page.goto(`/room/${code}`);

	// The browser has to be in the room before the bots are, or one of them takes
	// the host seat and the settings never render for us.
	await expect(page.getByRole('heading', { name: 'Lobby' })).toBeVisible();
	const readingTime = page.locator('input[type=number]').nth(2);
	await expect(readingTime).toBeVisible();

	table = await seatBots(baseURL, code, 2);
	await expect(page.getByText('Players (3)')).toBeVisible();

	// Host settings, in order: rounds, redraws, reading time. Shortened so a
	// round does not spend a minute of the suite's time waiting on a clock.
	await readingTime.fill(String(readingSeconds));
	await readingTime.blur();

	await page.getByRole('button', { name: "I'm ready" }).click();
	const start = page.getByRole('button', { name: 'Start the game' });
	await expect(start).toBeEnabled();
	await start.click();
	return code;
}

/**
 * Lock in, once there is something to lock in. The deal is a fetch to
 * Wikipedia, so the button is not there the instant the round starts, and the
 * guesser never gets one at all.
 */
async function settle(page: Page) {
	const lock = page.getByRole('button', { name: 'Lock this in' });
	const sittingOut = page.getByText("You're the guesser this round.");
	await expect(lock.or(sittingOut).first()).toBeVisible({ timeout: 30_000 });
	if (await lock.isVisible()) await lock.click();
}

/**
 * Get past the questioning. The bots only pick when the chair is theirs, so if
 * it landed on us nobody else is going to end this round.
 */
async function resolveQuestioning(page: Page) {
	await expect(page.getByRole('heading', { name: 'Questioning' })).toBeVisible({ timeout: 40_000 });
	const ours = page.getByText('Ask them anything you like.');
	if (await ours.isVisible().catch(() => false)) {
		await page.getByTestId('players').locator('li > button').first().click();
	}
}

test('a round runs from the lobby to the reveal', async ({ page, baseURL }) => {
	await startGame(page, baseURL!);

	await expect(page.getByRole('heading', { name: 'Choosing articles' })).toBeVisible();
	await settle(page);

	await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible({ timeout: 30_000 });
	const done = page.getByRole('button', { name: "I'm done reading" });
	if (await done.isVisible().catch(() => false)) await done.click();

	await resolveQuestioning(page);

	// The reveal names who read it and publishes the text.
	await expect(page.getByRole('heading', { name: 'Reveal' })).toBeVisible({ timeout: 40_000 });
	await expect(
		page.getByRole('button', { name: /Start round 2|See the final scores/ })
	).toBeVisible();
});

test('everyone reads their own article, and the guesser reads none', async ({ page, baseURL }) => {
	await startGame(page, baseURL!, 30);
	await settle(page);
	await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible({ timeout: 30_000 });

	const isGuesser = await page
		.getByText('Sit tight.')
		.isVisible()
		.catch(() => false);
	if (isGuesser) {
		// The guesser waits, and must not be shown anybody's article.
		await expect(page.getByRole('button', { name: "I'm done reading" })).toBeHidden();
	} else {
		// A guessee gets their own, in full, with a way out to Wikipedia.
		await expect(page.getByText("Here's your article. Read it!")).toBeVisible();
		await expect(page.getByRole('link', { name: 'Open the full article' })).toBeVisible();
	}
});

test('the topic is a title only until the reveal publishes it', async ({ page, baseURL }) => {
	await startGame(page, baseURL!);
	await settle(page);
	await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible({ timeout: 30_000 });
	const done = page.getByRole('button', { name: "I'm done reading" });
	if (await done.isVisible().catch(() => false)) await done.click();

	await expect(page.getByRole('heading', { name: 'Questioning' })).toBeVisible({ timeout: 40_000 });

	// Measured before the round is resolved, or this reads the reveal.
	// Whatever else is on the questioning screen, none of it is article prose:
	// the longest thing there should be the guidance, not an extract.
	const longestAtQuestioning = await page.evaluate(() =>
		Math.max(...[...document.querySelectorAll('main p')].map((p) => p.textContent!.trim().length))
	);

	await resolveQuestioning(page);
	await expect(page.getByRole('heading', { name: 'Reveal' })).toBeVisible({ timeout: 40_000 });
	const longestAtReveal = await page.evaluate(() =>
		Math.max(...[...document.querySelectorAll('main p')].map((p) => p.textContent!.trim().length))
	);

	// The article arrives at the reveal and not before it.
	expect(longestAtReveal).toBeGreaterThan(longestAtQuestioning);
});
