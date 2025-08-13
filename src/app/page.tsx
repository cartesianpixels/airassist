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
import { KnowledgeBase } from "@/components/knowledge-base";
import { ChatWelcome } from "@/components/chat-welcome";
import { ChatMessage } from "@/components/chat-message";
import { ChatForm } from "@/components/chat-form";
import type { Message } from "@/lib/types";
import { getAiResponse } from "./actions";
import { CHAT_HISTORY } from "@/lib/mock-data";
import { Book, History } from "lucide-react";
import { Separator } from "@/components/ui/separator";

function ChatArea() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (input: string) => {
    setIsLoading(true);
    const newMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content: input,
    };
    const newMessages = [...messages, newMessage];
    setMessages(newMessages);

    const { answer, resources } = await getAiResponse(
      newMessages.map(({ id, ...rest }) => rest)
    );

    const assistantMessage: Message = {
      id: String(Date.now() + 1),
      role: "assistant",
      content: answer,
      resources,
    };
    setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    setIsLoading(false);
  };
  return (
    <SidebarProvider>
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="border-r border-border/60"
    >
      <SidebarHeader>
        <AirAssistLogo />
      </SidebarHeader>
      <SidebarContent className="p-2 flex flex-col gap-4">
        <KnowledgeBase />
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground px-2 py-1">History</h2>
          <SidebarMenu>
            {CHAT_HISTORY.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  className="text-muted-foreground hover:text-foreground"
                  size="sm"
                  tooltip={{ children: item.title, side:"right" }}
                >
                  <History />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter>
        {/* Footer content can go here */}
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="flex flex-col bg-background">
      <header className="p-2 border-b flex items-center h-14">
        <SidebarTrigger className="md:hidden" />
        <h2 className="text-lg font-semibold ml-2">Procedure Assistant</h2>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
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
             <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <div className="p-4 md:p-6 border-t bg-background/80 backdrop-blur-sm">
          <ChatForm onSubmit={handleSendMessage} isLoading={isLoading} />
        </div>
      </main>
    </SidebarInset>
  </SidebarProvider>
  )
}


export default function Home() {
  const [isClient, setIsClient] = React.useState(false)
 
  React.useEffect(() => {
    setIsClient(true)
  }, [])
 
  return isClient ? <ChatArea /> : null;
}
