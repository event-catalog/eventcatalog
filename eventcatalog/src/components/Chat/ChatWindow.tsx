import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { BookOpen, Loader } from 'lucide-react';
import { Document } from 'langchain/document';
import { CreateWebWorkerMLCEngine, type InitProgressReport } from '@mlc-ai/web-llm';
import { VectorStore } from './vector-store';
import { useChat } from './ChatProvider';

declare global {
    interface Window {
        copyCode: (index: number, button: HTMLButtonElement) => void;
    }
}

const systemPrompt = `You are an AI assistant specializing in architecture analysis. Answer questions concisely and avoid repeating information.

## Context Format
The user will provide architecture details inside a <eventcatalog> tag, which contains multiple <resource> elements. Each <resource> has:
- An 'id': A unique identifier for the resource (event, service, system)
- A 'type': The category of the resource (event, service, command)
- Descriptive information about the resource

## Response Guidelines
1. Use only information from the provided <eventcatalog>
2. When you list resources (events, commands, queries, services or domains) always return clickable links to the resource, the format should be <a href="/docs/{resourceType}s/{id}">{id}</a>
3. Keep responses clear and concise
4. If information is missing, state what additional details are needed
5. Don't make up any information, only use the information provided in the <eventcatalog> tags and resouceType attributes.

## Example

Input:
<eventcatalog>
<resource id="OrderCreated" type="event">New order created event</resource>
</eventcatalog>

Response:
The \`OrderCreated\` event (<a href="/docs/events/OrderCreated">OrderCreated</a>) represents when a new order is created.

---

Now, answer the user's questions based on the architecture eventcatalog provided.`;

const vectorStore = new VectorStore();

const ChatWindow = () => {
    const [loading, setLoading] = useState(true);
    const [engine, setEngine] = useState<any>(null);
    const [messages, setMessages] = useState<Array<{ content: string; isUser: boolean }>>([]);
    const [inputValue, setInputValue] = useState('');
    const [showWelcome, setShowWelcome] = useState(true);
    const [isThinking, setIsThinking] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const completionRef = useRef<any>(null);
    const outputRef = useRef<HTMLDivElement>(null);

    const { sessions, currentSession, createSession, deleteSession, addMessageToSession, setCurrentSession } = useChat();

    // Load messages when session changes
    useEffect(() => {
        if (currentSession) {
            setMessages(currentSession.messages);
            setShowWelcome(false);
        } else {
            setMessages([]);
            setShowWelcome(true);
        }
    }, [currentSession]);

    // Helper function to stop the current completion
    const handleStop = async () => {
        if (completionRef.current) {
            try {
                await engine.interruptGenerate();
                completionRef.current = null;
                setIsStreaming(false);
                setIsThinking(false);
            } catch (error) {
                console.error('Error stopping completion:', error);
            }
        }
    };

    const handleSubmit = async () => {
        if (!inputValue.trim() || !engine) return;

        const userMessage = { content: inputValue, isUser: true };

        // Add message to UI and session store
        setMessages(prev => [...prev, userMessage]);
        
        if (currentSession) {
            addMessageToSession(currentSession.id, inputValue, true);
        }

        setIsThinking(true);
        setIsStreaming(true);
        setInputValue('');

        try {
            // Search vector store
            const results = await vectorStore.similaritySearchWithScore(inputValue, 1000);
            const filteredResults = results.filter(([doc, score]: [Document, number]) => score > 0.1);

            const qaPrompt = `\n".

                Here is context for the users question:
                
                ==========
                <eventcatalog>
                ${filteredResults.map((result: any) => `<resource type="${result[0].metadata.resourceType}" id="${result[0].metadata.id}">${result[0].pageContent}</resource>`).join("")}\n
                </eventcatalog>
                ==========
      
               
                ""
                `;

            // Get completion
            const completion = await engine.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "assistant",
                        content: "Understood! I'll refer to the provided architecture details when answering your questions."
                    },
                    {
                        role: "assistant",
                        content: qaPrompt
                    },
                    ...messages.map(msg => ({
                        role: msg.isUser ? "user" : "assistant",
                        content: msg.content
                    })),
                    {
                        role: "user",
                        content: inputValue
                    }
                ],
                stream: true,
                temperature: 0.1,
                max_tokens: 8192,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            });

            // Store completion reference for potential cancellation
            completionRef.current = completion;

            let isFirstChunk = true;
            let responseText = '';

            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        responseText += content;

                        if (isFirstChunk) {
                            setIsThinking(false);
                            setMessages(prev => [...prev, { content: responseText, isUser: false }]);
                            isFirstChunk = false;
                        } else {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                newMessages[newMessages.length - 1] = {
                                    ...newMessages[newMessages.length - 1],
                                    content: responseText
                                };
                                return newMessages;
                            });
                        }
                        // Add scroll after each chunk
                        scrollToBottom();
                    }
                }

                // Only add to session store after complete response
                if (currentSession) {
                    addMessageToSession(currentSession.id, responseText, false);
                }
            } catch (error: any) {
                if (error.message?.includes('cancelled')) {
                    console.log('Completion was stopped by the user');
                } else {
                    throw error;
                }
            }

            setIsThinking(false);
            setIsStreaming(false);
            completionRef.current = null;
        } catch (error: any) {
            console.error('Error:', error);
            const errorMessage = { content: 'Sorry, there was an error processing your request.', isUser: false };
            setMessages(prev => [...prev, errorMessage]);
            if (currentSession) {
                addMessageToSession(currentSession.id, errorMessage.content, false);
            }
            setIsThinking(false);
            setIsStreaming(false);
            completionRef.current = null;
        }
    };

    const initProgressCallback = (report: InitProgressReport) => {
        console.log('report', report);
        if (report.progress === 1) {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initEngine = async () => {
            try {
                const engineCreator = CreateWebWorkerMLCEngine;
                const newEngine = await engineCreator(
                    new Worker(new URL('./workers/engine.ts', import.meta.url), { type: 'module' }),
                    'Llama-2-7b-chat-hf-q4f16_1-MLC',
                    { initProgressCallback }
                );
                setEngine(newEngine);
            } catch (error) {
                console.error('Failed to initialize model:', error);
            }
        };

        initEngine();
    }, []);

    // // Add effect to show initial AI message when engine is loaded
    // useEffect(() => {
    //     if (!loading && engine && messages.length === 0 && !currentSession) {
    //         setMessages([{ content: "How can I help you today?", isUser: false }]);
    //     }
    // }, [loading, engine, messages.length, currentSession]);

    // Helper function to format message content
    const formatMessageContent = (content: string): string => {
        // First handle code blocks
        let formattedContent = content.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
            const escapedCode = codeContent.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre class="bg-gray-800 border border-gray-700 p-4 my-3 rounded-lg overflow-x-auto"><code class="text-sm font-mono text-gray-200">${escapedCode}</code></pre>`;
        });

        // Handle inline code
        formattedContent = formattedContent.replace(/(?<!`)`([^`]+)`(?!`)/g, (match, code) => {
            const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<code class="bg-gray-500 border border-gray-700 px-2 py-0.5 rounded text-sm font-mono text-gray-200">${escapedCode}</code>`;
        });

        // Handle links
        formattedContent = formattedContent.replace(
            /<a\s+href="([^"]+)">/g,
            '<a href="$1" class="text-purple-600 hover:underline" target="_blank" rel="noopener noreferrer">'
        );

        // Convert newlines to <br>
        formattedContent = formattedContent.replace(/\n(?!<\/code>)/g, '<br>');

        return formattedContent;
    };

    // Add new function to handle smooth scrolling
    const scrollToBottom = (smooth = true) => {
        if (outputRef.current) {
            outputRef.current.scrollTo({
                top: outputRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    };

    // Add effect to scroll when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-60px)] w-full">
            {/* Chat Messages */}
            <div 
                id="output" 
                ref={outputRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 w-full mx-auto"
            >
                {showWelcome || messages.length === 0 ? (
                    <div id="welcomeMessage" className="flex justify-center items-center h-full">
                        <div className="text-center space-y-6 max-w-2xl px-4">
                            <div className="flex justify-center">
                                <BookOpen size={48} strokeWidth={1.5} className="text-gray-400" />
                            </div>
                            <div className="space-y-4">
                                <h1 className="text-3xl font-semibold text-gray-800">Ask questions about your architecture</h1>
                                <p className="text-sm text-gray-500">AI Models are local and do not leave your device.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 max-w-[900px] mx-auto">
                        {messages.map((message, index) => (
                            <div 
                                key={index} 
                                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
                            >
                                <div 
                                    className={`max-w-[80%] rounded-lg p-3 ${
                                        message.isUser
                                            ? 'bg-purple-600 text-white rounded-br-none'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                                />
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex justify-start mb-4">
                                <div className="flex items-center space-x-2 max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-800 rounded-bl-none">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Loading Status */}
            {loading  && (
                <div className="max-w-[900px] mx-auto w-full px-4">
                    <div id="loadingStatus" className="mb-2 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-center loading-status">
                        Initializing AI model...
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4 bg-white">
                <div className="max-w-[900px] mx-auto relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="What events do we have?"
                        className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg border border-gray-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed pr-24"
                        disabled={loading || isStreaming}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-2">
                        {isStreaming ? (
                            <button
                                onClick={handleStop}
                                className="px-4 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                            >
                                Stop
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                className="px-4 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-sm font-medium"
                                disabled={loading}
                            >
                                Send
                            </button>
                        )}
                    </div>
                    <div className="max-w-[900px] mx-auto w-full px-4 text-center">
                        <p className="text-xs text-gray-500 py-2">EventCatalog AI can make mistakes. Check important info.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow; 