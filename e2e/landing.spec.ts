import { expect, test } from '@playwright/test';
import { createRoom } from './table';

test.describe('the front page', () => {
	test('never scrolls sideways, at any phone width', async ({ page }) => {
		await page.goto('/');
		// 320 is about the narrowest screen still in use; the wordmark is sized in
		// vw and cannot wrap, so it has overflowed here before.
		for (const width of [320, 360, 375, 414]) {
			await page.setViewportSize({ width, height: 720 });
			const overflows = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);
			expect(overflows, `horizontal overflow at ${width}px`).toBe(false);
		}
	});

	test('turns a bad room code down without leaving the page', async ({ page }) => {
		await page.goto('/');
		await page.getByLabel('Got a room code?').fill('!!');
		await page.getByRole('button', { name: 'Join' }).click();

		await expect(page.getByText('Room codes are four letters and numbers.')).toBeVisible();
		await expect(page).toHaveURL('/');
	});

	test('hosting opens a room', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Host a new game' }).click();
		await expect(page).toHaveURL(/\/room\/[A-Z0-9]{4}$/);
		await expect(page.getByRole('heading', { name: 'Lobby' })).toBeVisible();
	});

	test('joining by code lands in that room, however you type it', async ({ page, baseURL }) => {
		const code = await createRoom(baseURL!);
		await page.goto('/');
		// Codes get read out loud and typed back in lower case.
		await page.getByLabel('Got a room code?').fill(code.toLowerCase());
		await page.getByRole('button', { name: 'Join' }).click();
		await expect(page).toHaveURL(`/room/${code}`);
	});
});
