import { Config, Context, Effect, Layer, Schema } from "effect";

import { FetchError, JsonError } from "./errors";
import { Pokemon } from "./schemas";

// Main goal of this step is to refactor services to provide default implementation with `Effect.Service`

class PokemonCollection extends Effect.Service<PokemonCollection>()(
	"PokemonCollection",
	{
		// default implementation
		succeed: ["staryu", "perrserker", "flaaffy"],
	},
) {}

// !NB: `Effect.Service` accepts all types that can be assign to `implements` in a `class` declaration which doesnt include primitives, so must fallback to `Context.Tag` here
class PokeApiUrl extends Context.Tag("PokeApiUrl")<PokeApiUrl, string>() {
	static readonly Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const baseUrl = yield* Config.string("BASE_URL");

			return `${baseUrl}/pokemon`;
		}),
	);
}

class BuildPokeApiUrl extends Effect.Service<BuildPokeApiUrl>()(
	"BuildPokeApiUrl",
	{
		effect: Effect.gen(function* () {
			const pokeApiUrl = yield* PokeApiUrl;

			return ({ name }: { name: string }) => `${pokeApiUrl}/${name}`;
		}),
		dependencies: [PokeApiUrl.Live],
	},
) {}

class PokeApi extends Effect.Service<PokeApi>()("PokeApi", {
	effect: Effect.gen(function* () {
		const pokemonCollection = yield* PokemonCollection;
		const buildPokeApiUrl = yield* BuildPokeApiUrl;

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
	dependencies: [PokemonCollection.Default, BuildPokeApiUrl.Default],
}) {}

const program = Effect.gen(function* () {
	const pokeApi = yield* PokeApi;

	return yield* pokeApi.getPokemon;
});

const MainLayer = Layer.mergeAll(PokeApi.Default);

const liveProgram = program.pipe(Effect.provide(MainLayer));

const main = liveProgram.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
