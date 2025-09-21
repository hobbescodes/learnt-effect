import { Config, Effect, Schema } from "effect";

import { FetchError, JsonError } from "./errors";
import { Pokemon } from "./schemas";

export class PokemonCollection extends Effect.Service<PokemonCollection>()(
	"PokemonCollection",
	{
		succeed: ["staryu", "perrserker", "flaaffy"],
	},
) {}

export class PokeApiUrl extends Effect.Service<PokeApiUrl>()("PokeApiUrl", {
	effect: Effect.gen(function* () {
		const baseUrl = yield* Config.string("BASE_URL");

		return ({ name }: { name: string }) => `${baseUrl}/pokemon/${name}`;
	}),
}) {}

export class PokeApi extends Effect.Service<PokeApi>()("PokeApi", {
	effect: Effect.gen(function* () {
		const pokemonCollection = yield* PokemonCollection;
		const buildPokeApiUrl = yield* PokeApiUrl;

		return {
			getPokemon: Effect.gen(function* () {
				const requestUrl = buildPokeApiUrl({ name: pokemonCollection[0] });

				const response = yield* Effect.tryPromise({
					try: () => fetch(requestUrl),
					catch: () => new FetchError(),
				});

				if (!response.ok) {
					return yield* new FetchError();
				}

				const json = yield* Effect.tryPromise({
					try: () => response.json(),
					catch: () => new JsonError(),
				});

				return yield* Schema.decodeUnknown(Pokemon)(json);
			}),
		};
	}),
	dependencies: [PokemonCollection.Default, PokeApiUrl.Default],
}) {}
