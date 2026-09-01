<script lang="ts">
	import { env as publicEnv } from '$env/dynamic/public';
	import Card from '$lib/Card.svelte';
	import Table from '$lib/game/Table.svelte';
	import { GameConnection } from '$lib/game-connection.svelte';
	import { t } from '$lib/i18n';

	const text = t();

	let connection = $state<GameConnection | null>(null);
	let problem = $state<string | null>(null);

	const room = $derived(connection?.state ?? null);

	/**
	 * Inside an activity Discord already knows who everyone is and which call
	 * they are in, so there is no sign-in and no lobby to join: authorise, trade
	 * the code for one of our player tokens, and open the room the whole voice
	 * channel shares.
	 */
	$effect(() => {
		let live: GameConnection | null = null;
		let cancelled = false;

		(async () => {
			const clientId = publicEnv.PUBLIC_DISCORD_CLIENT_ID;
			if (!clientId) {
				problem = 'This build has no Discord client id, so the activity cannot start.';
				return;
			}

			// Imported here rather than at the top so the website never pays for the
			// SDK, which is only meaningful inside Discord.
			const { DiscordSDK } = await import('@discord/embedded-app-sdk');
			const sdk = new DiscordSDK(clientId);
			await sdk.ready();

			const { code } = await sdk.commands.authorize({
				client_id: clientId,
				response_type: 'code',
				state: '',
				prompt: 'none',
				// identify is all the game needs: a name and a face for the table.
				scope: ['identify']
			});

			const response = await fetch('/api/discord/session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code })
			});
			if (!response.ok) {
				problem = 'Discord would not confirm who you are. Try relaunching the activity.';
				return;
			}
			const session = (await response.json()) as {
				accessToken: string;
				token: string;
				name: string;
			};

			await sdk.commands.authenticate({ access_token: session.accessToken });
			if (cancelled) return;

			// The activity instance is the room. Everyone who launched it together
			// lands in the same game without anybody reading a code aloud.
			live = new GameConnection(sdk.instanceId, session.token, session.name, 'discord');
			connection = live;
			live.connect();
		})().catch((cause) => {
			console.error('the activity could not start', cause);
			problem = 'The activity could not start.';
		});

		return () => {
			cancelled = true;
			live?.close();
		};
	});
</script>

<svelte:head>
	<title>{text.brand}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if problem}
	<Card>
		<h1 class="wiki-heading text-2xl">{text.brand}</h1>
		<p class="text-muted mt-2">{problem}</p>
	</Card>
{:else if !room || !connection}
	<Card>
		<p class="text-muted text-center">{text.room.connecting}</p>
	</Card>
{:else}
	<!-- No room code and no invite: Discord already put everyone in the same
	     call, which is the whole reason the activity exists. -->
	<Table
		{connection}
		eyebrow={room.stage === 'lobby' || room.stage === 'finished'
			? text.brand
			: text.room.roundOf(room.round, room.settings.rounds)}
	/>
{/if}
