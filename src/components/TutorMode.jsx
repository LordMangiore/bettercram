import { useState } from "react";
import { tutorChat } from "../api";

export default function TutorMode({ cards }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState("explain");

  async function handleAction(action) {
    if (!selectedCard) return;
    setLoading(true);
    setResult(null);
    setActiveTab(action);
    try {
      const { response } = await tutorChat(selectedCard, action);
      setResult(response);
      if (action === "explain" || action === "mnemonic") {
        setChatMessages([
          { role: "user", content: action === "explain" ? `Explain: ${selectedCard.front}` : `Create mnemonics for: ${selectedCard.front}` },
          { role: "assistant", content: response },
        ]);
      }
    } catch (e) {
      setResult(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleChat(e) {
    e.preventDefault();
    if (!chatInput.trim() || !selectedCard) return;

    const newMessages = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");
    setLoading(true);

    try {
      const { response } = await tutorChat(selectedCard, "chat", newMessages);
      setChatMessages([...newMessages, { role: "assistant", content: response }]);
    } catch (err) {
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!selectedCard) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
            <i className="fa-solid fa-graduation-cap text-indigo-600 dark:text-indigo-400 mr-2" />
            AI Tutor
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a card to get deep explanations, mnemonics, or ask questions
          </p>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto hide-scrollbar">
          {cards.map((card, i) => (
            <button
              key={i}
              onClick={() => {
                setSelectedCard(card);
                setChatMessages([]);
                setResult(null);
              }}
              className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium line-clamp-2">
                  {card.front}
                </p>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {card.category}
                </span>
              </div>
            </button>
          ))}
          {cards.length === 0 && (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">No cards in this category</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Selected card header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
              {selectedCard.category}
            </span>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-2">{selectedCard.front}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedCard.back}</p>
          </div>
          <button
            onClick={() => {
              setSelectedCard(null);
              setResult(null);
              setChatMessages([]);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-3"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleAction("explain")}
          disabled={loading}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "explain"
              ? "bg-indigo-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          } disabled:opacity-50`}
        >
          <i className="fa-solid fa-lightbulb mr-1.5" />
          Explain
        </button>
        <button
          onClick={() => handleAction("mnemonic")}
          disabled={loading}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "mnemonic"
              ? "bg-indigo-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          } disabled:opacity-50`}
        >
          <i className="fa-solid fa-brain mr-1.5" />
          Mnemonic
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "chat"
              ? "bg-indigo-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <i className="fa-solid fa-comments mr-1.5" />
          Ask
        </button>
      </div>

      {/* Loading */}
      {loading && !chatMessages.length && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-600 dark:text-indigo-400 mb-3 block" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Thinking...</p>
        </div>
      )}

      {/* Result display for explain/mnemonic */}
      {result && activeTab !== "chat" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div
            className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(result) }}
          />
        </div>
      )}

      {/* Chat interface */}
      {activeTab === "chat" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="max-h-[50vh] overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
                <i className="fa-solid fa-comments mr-1" />
                Ask anything about this topic
              </p>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                    />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                  <i className="fa-solid fa-ellipsis fa-beat text-gray-400" />
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleChat} className="border-t border-gray-200 dark:border-gray-700 p-3 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !chatInput.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <i className="fa-solid fa-paper-plane" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function formatMarkdown(text) {
  return text
    .replace(/## (.*)/g, '<h3 class="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-indigo-700 dark:text-indigo-300 text-xs">$1</code>')
    .replace(/^- (.*)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*)/gm, '<li class="ml-4 list-decimal">$1. $2</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
