import Algolia from "algoliasearch";
import { useState, useCallback } from "react";
import { ActionPanel, Action, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { Hit } from "@algolia/client-search/dist/client-search";
import unescape from "lodash/unescape";

const client = Algolia("E3MIRNPJH5", "1fa3a8fec06eb1858d6ca137211225c0");
const index = client.initIndex("laravel");

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search Laravel Docs..."
      throttle
    >
      <List.Section title="Results" subtitle={state.version}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.title}
      accessoryTitle={searchResult.hierarchy}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          <Action.CopyToClipboard content={searchResult.url} title="Copy URL" />
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: false,
    version: getPreferenceValues<Preferences>().version,
  });

  const search = useCallback(
    async function search(searchText: string) {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));

      try {
        const results = await performSearch(searchText, state.version);

        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        console.error("search error", error);

        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [setState]
  );

  return {
    state,
    search,
  };
}

async function performSearch(searchText: string, version: string): Promise<SearchResult[]> {
  if (searchText.trim().length === 0) {
    return [];
  }

  const response = (await index.search(searchText, {
    facetFilters: ["version:" + version],
    hitsPerPage: 8,
  })) as { hits: Hit<{ url: string; hierarchy: object; content: string }>[] };

  return response.hits.map((result) => {
    const hierarchy = Object.values(result.hierarchy)
      .filter((val) => val)
      .map((val) => unescape(val));

    return {
      id: result.objectID,
      url: result.url,
      title: hierarchy.pop() ?? result.content,
      hierarchy: hierarchy.join(" » "),
    };
  });
}

interface SearchState {
  version: string;
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  id: string;
  url: string;
  title: string;
  hierarchy: string;
}

interface Preferences {
  version: string;
}
