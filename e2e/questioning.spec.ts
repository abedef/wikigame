import { expect, test, type Page } from '@playwright/test';
import { createRoom, seatBots, type Table } from './table';

let table: Table | null = null;
test.afterEach(() => {
	table?.close();
	table = null;
});

async function startGame(page: Page, baseURL: string) {
	const code = await createRoom(baseURL);
	await page.goto(`/room/${code}`);
	await expect(page.getByRole('heading', { name: 'Lobby' })).toBeVisible();
	const readingTime = page.locator('input[type=number]').nth(2);
	await expect(readingTime).toBeVisible();

	table = await seatBots(baseURL, code, 2);
	await expect(page.getByText('Players (3)')).toBeVisible();
	await readingTime.fill('12');
	await readingTime.blur();

	await page.getByRole('button', { name: "I'm ready" }).click();
	const start = page.getByRole('button', { name: 'Start the game' });
	await expect(start).toBeEnabled();
	await start.click();
}

/**
 * Play on until the chair is ours. The bots always pick the human, so the round
 * after the first one is always ours; sometimes the first one already is.
 */
async function playUntilGuessing(page: Page) {
	for (let round = 0; round < 3; round++) {
		const lock = page.getByRole('button', { name: 'Lock this in' });
		const sittingOut = page.getByText("You're the guesser this round.");
		await expect(lock.or(sittingOut).first()).toBeVisible({ timeout: 30_000 });
		if (await lock.isVisible()) await lock.click();

		const done = page.getByRole('button', { name: "I'm done reading" });
		if (await done.isVisible().catch(() => false)) await done.click();

		const asking = page.getByText('Ask them anything you like.');
		const next = page.getByRole('button', { name: /Start round \d|See the final scores/ });
		await expect(asking.or(next).first()).toBeVisible({ timeout: 40_000 });
		if (await asking.isVisible()) return;
		await next.click();
	}
	throw new Error('never got the chair');
}

test('the guesser can tell which players are pickable', async ({ page, baseURL }) => {
	await startGame(page, baseURL!);
	await playUntilGuessing(page);

	const rows = page.getByTestId('players').locator('li > *');
	await expect(rows).toHaveCount(3);

	// The two we can accuse are buttons and say so. This is the regression that
	// shipped once already: they were styled identically to our own row, and the
	// only cues were a pointer cursor and a hover border, neither of which
	// exists on a touchscreen.
	const pickable = page.getByTestId('players').locator('li > button');
	await expect(pickable).toHaveCount(2);
	for (const row of await pickable.all()) {
		await expect(row).toContainText('[pick]');
	}

	// Our own row is not one of them, and does not pretend to be.
	const own = page.getByTestId('players').locator('li > div').filter({ hasText: '(you)' });
	await expect(own).toHaveCount(1);
	await expect(own).not.toContainText('[pick]');

	// And a pickable row is visibly distinct, not just semantically.
	const [pickableBorder, ownBorder] = await Promise.all([
		pickable.first().evaluate((el) => getComputedStyle(el).borderColor),
		own.evaluate((el) => getComputedStyle(el).borderColor)
	]);
	expect(pickableBorder).not.toBe(ownBorder);
});

test('picking a player ends the round', async ({ page, baseURL }) => {
	await startGame(page, baseURL!);
	await playUntilGuessing(page);

	await page.getByTestId('players').locator('li > button').first().click();
	await expect(page.getByRole('heading', { name: 'Reveal' })).toBeVisible();
});

test('the help dialog says what this player should be doing now', async ({ page, baseURL }) => {
	await startGame(page, baseURL!);
	await playUntilGuessing(page);

	await page.getByRole('button', { name: 'What am I meant to be doing?' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	// Guidance for the stage we are actually in, not a generic rules dump.
	await expect(dialog).toContainText('Right now');
	await expect(dialog).toContainText('Only one of them actually read this article');
	await expect(dialog).toContainText('2 points');

	await dialog.getByRole('button', { name: 'Got it' }).click();
	await expect(dialog).toBeHidden();
});
