import { Config, Context, Effect, Layer, Schema } from "effect";

import { FetchError, JsonError } from "./errors";
import { Pokemon } from "./schemas";

// biome-ignore lint: who cares
import type { Array } from "effect";

class PokemonCollection extends Context.Tag("PokemonCollection")<
	PokemonCollection,
	Array.NonEmptyArray<string>
>() {
	static readonly Live = Layer.succeed(this, [
		"staryu",
		"perrserker",
		"flaaffy",
	]);
}

class PokeApiUrl extends Context.Tag("PokeApiUrl")<PokeApiUrl, string>() {
	static readonly Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const baseUrl = yield* Config.string("BASE_URL");

			return `${baseUrl}/pokemon`;
		}),
	);
}

class BuildPokeApiUrl extends Context.Tag("BuildPokeApiUrl")<
	BuildPokeApiUrl,
	({ name }: { name: string }) => string
>() {
	static readonly Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const pokeApiUrl = yield* PokeApiUrl;

			return ({ name }) => `${pokeApiUrl}/${name}`;
		}),
	).pipe(Layer.provide(PokeApiUrl.Live));
}

const make = Effect.gen(function* () {
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
});

class PokeApi extends Context.Tag("PokeApi")<
	PokeApi,
	Effect.Effect.Success<typeof make>
>() {
	static readonly Live = Layer.effect(this, make).pipe(
		Layer.provide(Layer.mergeAll(PokemonCollection.Live, BuildPokeApiUrl.Live)),
	);

	static readonly Mock = Layer.succeed(
		this,
		PokeApi.of({
			getPokemon: Effect.succeed({
				id: 1,
				height: 10,
				weight: 10,
				name: "mock-name",
				order: 1,
			}),
		}),
	);
}

const program = Effect.gen(function* () {
	const pokeApi = yield* PokeApi;

	return yield* pokeApi.getPokemon;
});

// With the added `Mock` parameter, swapping layers for mocking becomes as simple as replacing below with `PokeApi.Mock`
const MainLayer = Layer.mergeAll(PokeApi.Live);

const liveProgram = program.pipe(Effect.provide(MainLayer));

const main = liveProgram.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
