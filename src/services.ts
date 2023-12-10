import { getStorage } from "./utils";

interface TabGroup {
  type: string;
  tabIds: (number | undefined)[];
}

const getGroupSuggestionFromOpenAI = async (
  apiURL: string,
  openAIKey: string,
  tabUrl: string | undefined,
  model: string,
  types: string[]
): Promise<string> => {
  const response = await fetch(`${apiURL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "You are a classificator",
        },
        {
          role: "user",
          content: `Based on the URL ${tabUrl}, try to classify the browser tab type as one of the following: ${types.join(
            ", "
          )} with your best effort. For example, Social Media, Social Network, Social Networking should all be considered the same type, so as long as one of them exists, you should reuse it. If however you are not able to find any existing suitable tab type, create a new one. Reply with only the classification tab type.`,
        },
      ],
      model,
    }),
  });

  const data = await response.json();
  const type = data.choices[0].message.content;

  return type;
};

export async function batchGroupTabs(
  tabs: chrome.tabs.Tab[],
  types: string[],
  openAIKey: string
) {
  const tabInfoList = tabs.map((tab) => {
    return {
      id: tab.id,
      title: tab.title,
      url: tab.url,
    };
  });

  const result: TabGroup[] = types.map((type) => {
    return {
      type,
      tabIds: [],
    };
  });

  const model = (await getStorage("model")) || "gpt-4";
  const apiURL = (await getStorage("apiURL")) || "https://api.openai.com";

  try {
    await Promise.all(
      tabInfoList.map(async (tab) => {
        if (!tab.url) return;
        const suggestedType: string = await getGroupSuggestionFromOpenAI(
          apiURL,
          openAIKey,
          tab.url,
          model,
          types
        );

        const index = types.indexOf(suggestedType);
        if (index === -1) return;
        result[index].tabIds.push(tab.id);
      })
    );
    return result;
  } catch (error) {
    console.error(error);
    return result;
  }
}

export async function handleOneTab(
  tab: chrome.tabs.Tab,
  types: string[],
  openAIKey: string
) {
  try {
    const model = (await getStorage("model")) || "gpt-4";
    const apiURL = (await getStorage("apiURL")) || "https://api.openai.com";

    return getGroupSuggestionFromOpenAI(
      apiURL,
      openAIKey,
      tab.url,
      model,
      types
    );
  } catch (error) {
    console.error(error);
  }
}
