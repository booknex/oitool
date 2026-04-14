import { useState } from "react";
import { Phone, Mail, MessageSquare, ChevronDown, ChevronUp, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const FAQS = [
  {
    q: "How do I restock inventory items?",
    a: "Go to the Supply Kiosk, click 'Restock All' to reset everything to max stock, or use the manage panel to restock individual items.",
  },
  {
    q: "How do I add a new property?",
    a: "Navigate to the Reviews page and tap the pencil (edit) icon in the top-right corner, then tap the '+' button to add a new property.",
  },
  {
    q: "How do I create an invoice?",
    a: "Open the Invoicing app from the dashboard, go to Invoices in the left menu, and click '+ New Invoice'. Make sure you have at least one customer added first.",
  },
  {
    q: "How do I sync my Airbnb calendar?",
    a: "Go to the Calendar page, open a property and paste the iCal URL from your Airbnb listing. The calendar syncs automatically every 15 minutes.",
  },
  {
    q: "How do I add a new affiliate?",
    a: "Open the SaaS Admin dashboard from the home screen, go to the Affiliates tab, and click '+ Add Affiliate'.",
  },
  {
    q: "How do I mark an invoice as paid?",
    a: "In the Invoicing app, open the Invoices tab, hover over an invoice row and click the three-dot menu, then select 'Paid' under Change Status.",
  },
];

export default function Support() {
  const { toast } = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    toast({ title: "Message sent", description: "We'll get back to you within 24 hours." });
    setForm({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setSubmitted(false), 4000);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[#6366F1] px-8 py-12 text-white">
        <h1 className="text-3xl font-bold mb-1">Support</h1>
        <p className="text-indigo-200 text-sm">How can we help you today?</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="font-semibold text-sm text-foreground">Call Us</p>
              <p className="text-xs text-muted-foreground">Mon–Fri, 9am–5pm</p>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">(512) 000-0000</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="font-semibold text-sm text-foreground">Email Us</p>
              <p className="text-xs text-muted-foreground">Response within 24h</p>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">support@cleanexinc.com</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="font-semibold text-sm text-foreground">Hours</p>
              <p className="text-xs text-muted-foreground">Mon–Fri</p>
              <p className="text-sm font-medium text-foreground">9:00 AM – 5:00 PM</p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-border rounded-md overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground hover-elevate"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  data-testid={`faq-toggle-${i}`}
                >
                  <span>{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3 text-sm text-muted-foreground border-t border-border pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Send a Message</h2>
          <Card>
            <CardContent className="pt-6">
              {submitted ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                  <p className="font-semibold text-foreground">Message sent!</p>
                  <p className="text-sm text-muted-foreground">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="sup-name">Name</Label>
                      <Input
                        id="sup-name"
                        placeholder="Your name"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        required
                        data-testid="input-support-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sup-email">Email</Label>
                      <Input
                        id="sup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        required
                        data-testid="input-support-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-subject">Subject</Label>
                    <Input
                      id="sup-subject"
                      placeholder="What's this about?"
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      required
                      data-testid="input-support-subject"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sup-message">Message</Label>
                    <Textarea
                      id="sup-message"
                      placeholder="Describe your issue or question…"
                      rows={5}
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      required
                      data-testid="input-support-message"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" data-testid="button-support-submit">
                      <MessageSquare className="w-4 h-4 mr-2" /> Send Message
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
