"use client";

import * as React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AirAssistLogo } from "@/components/icons";
import { ChatMessage } from "@/components/chat-message";
import { ChatForm } from "@/components/chat-form";
import type { Message } from "@/lib/types";
import { getAiResponse } from "./actions";
import { PlusCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';

const ChatWelcome = dynamic(() => import('@/components/chat-welcome').then(mod => mod.ChatWelcome), { ssr: false });


interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export default function Home() {
  const [chatHistory, setChatHistory] = React.useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector("div[data-radix-scroll-area-viewport]");
      if (viewport) {
         setTimeout(() => {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
          }, 100);
      }
    }
  };

  React.useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user' || (lastMessage.role === 'assistant' && !document.hidden)) {
          const viewport = scrollAreaRef.current?.querySelector("div[data-radix-scroll-area-viewport]");
          if (viewport) {
              const isScrolledToBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 20;
              if (isScrolledToBottom) {
                  scrollToBottom();
              }
          }
      }
    }
  }, [messages]);


  const handleSendMessage = async (input: string) => {
    setIsLoading(true);
    let currentChatId = activeChatId;

    const userMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content: input,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    const viewport = scrollAreaRef.current?.querySelector("div[data-radix-scroll-area-viewport]");
    if (viewport) {
        setTimeout(() => {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
        }, 100);
    }


    if (!activeChatId) {
      const newChat: ChatSession = {
        id: String(Date.now()),
        title: input.substring(0, 30) + (input.length > 30 ? "..." : ""),
        messages: newMessages,
      };
      currentChatId = newChat.id;
      setActiveChatId(newChat.id);
      setChatHistory(prev => [newChat, ...prev]);
    } else {
      setChatHistory(prev =>
        prev.map(chat =>
          chat.id === activeChatId ? { ...chat, messages: newMessages } : chat
        )
      );
    }

    const { answer, resources } = await getAiResponse(
      newMessages.map(({ id, ...rest }) => rest)
    );

    const assistantMessage: Message = {
      id: String(Date.now() + 1),
      role: "assistant",
      content: answer,
      resources,
    };
    
    const finalMessages = [...newMessages, assistantMessage];
    setMessages(finalMessages);
    setChatHistory(prev =>
      prev.map(chat =>
        chat.id === currentChatId ? { ...chat, messages: finalMessages } : chat
      )
    );
    setIsLoading(false);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  const loadChat = (chatId: string) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setActiveChatId(chat.id);
      setMessages(chat.messages);
    }
  };

  return (
    <SidebarProvider>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-r border-sidebar-border/60 bg-sidebar text-sidebar-foreground"
      >
        <SidebarHeader>
          <AirAssistLogo />
        </SidebarHeader>
        <SidebarContent className="p-2 flex flex-col gap-4">
          <div>
            <Button variant="ghost" className="w-full justify-start gap-2 mb-2 text-sidebar-primary-foreground bg-sidebar-primary hover:bg-sidebar-primary/90" onClick={handleNewChat}>
              <PlusCircle />
              <span>New Chat</span>
            </Button>
            <h2 className="text-sm font-semibold text-sidebar-foreground/70 px-2 py-1">History</h2>
            <SidebarMenu>
              {chatHistory.map((item) => (
                <SidebarMenuItem key={item.id} onClick={() => loadChat(item.id)}>
                  <SidebarMenuButton
                    className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    size="sm"
                    tooltip={{ children: item.title, side: "right" }}
                    isActive={item.id === activeChatId}
                  >
                    <History />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        </SidebarContent>
        <SidebarFooter>{/* Footer content can go here */}</SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col bg-background">
        <header className="p-2 border-b flex items-center h-14">
          <SidebarTrigger className="md:hidden" />
          <h2 className="text-lg font-semibold ml-2">Procedure Assistant</h2>
        </header>
        <main className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 md:p-6">
              {messages.length === 0 ? (
                <ChatWelcome onPromptClick={handleSendMessage} />
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 md:p-6 border-t bg-background/80 backdrop-blur-sm">
            <ChatForm onSubmit={handleSendMessage} isLoading={isLoading} />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
