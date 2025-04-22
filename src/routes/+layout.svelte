<script lang="ts">
	import { page } from '$app/state';
	import '../app.css';

	let { data, children } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center">
	<nav class="fixed top-0 flex w-full justify-center">
		{#if data.room && !page.url.pathname.includes('/room/')}
			<a href="/room/{data.room.code}">click here to rejoin room {data.room.code}</a>
		{/if}
	</nav>
	{@render children()}
</div>
