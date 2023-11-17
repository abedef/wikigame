import { createPlayer, getPlayer } from "$lib/sockets";
import type { PageServerLoad } from "./$types";

export const load = (async ({ cookies }) => {
  const id = cookies.get("id");
  let player = (await getPlayer(id)) ?? (await createPlayer());
  cookies.set("id", player.id, {
    expires: new Date(`${new Date().getFullYear() + 2}`),
  });

  return { id: player.id, name: player.name };
}) satisfies PageServerLoad;
