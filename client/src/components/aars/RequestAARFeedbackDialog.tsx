import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { CheckIcon, CopyIcon, InfoIcon, QrCodeIcon, Share2Icon } from "lucide-react";
import QRCode from "qrcode";
import { useEffect } from "react";

interface RequestAARFeedbackDialogProps {
  eventId: number;
  eventTitle: string;
  participants: number[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RequestAARFeedbackDialog({
  eventId,
  eventTitle,
  participants,
  open: controlledOpen,
  onOpenChange,
}: RequestAARFeedbackDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;
  const [notifyParticipants, setNotifyParticipants] = useState(true);
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Generate the submission URL
  const baseUrl = window.location.origin;
  const submitAarUrl = `${baseUrl}/submit-aar/${eventId}`;

  // Generate QR code on component mount
  useEffect(() => {
    if (open && !qrCodeDataURL) {
      QRCode.toDataURL(submitAarUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000',
          light: '#fff'
        }
      })
        .then(url => {
          setQrCodeDataURL(url);
        })
        .catch(err => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [submitAarUrl, open, qrCodeDataURL]);

  // Handle copying link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(submitAarUrl)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(err => {
        console.error('Error copying text: ', err);
        toast({
          title: "Failed to copy",
          description: "Please copy the URL manually.",
          variant: "destructive"
        });
      });
  };

  // Handle sending notification to participants
  const handleSendRequestToParticipants = async () => {
    if (!notifyParticipants || participants.length === 0) {
      toast({
        title: "No participants to notify",
        description: "Use the link or QR code to share the AAR submission page."
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/events/${eventId}/request-aar-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notifyParticipants })
      });

      if (!response.ok) {
        throw new Error('Failed to send AAR feedback request');
      }

      setRequestSent(true);
      toast({
        title: "Success",
        description: "AAR feedback request sent to all participants."
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notification to participants.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request AAR Feedback</DialogTitle>
          <DialogDescription>
            Share this link with participants to collect After-Action Reviews for {eventTitle}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="qrcode">QR Code</TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="pt-4">
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="aarLink" className="sr-only">AAR Submission Link</Label>
                <Input
                  id="aarLink"
                  defaultValue={submitAarUrl}
                  readOnly
                  className="h-9"
                />
              </div>
              <Button type="button" size="sm" onClick={handleCopyLink}>
                {linkCopied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
              </Button>
            </div>

            <div className="mt-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="notifyParticipants" 
                  checked={notifyParticipants} 
                  onCheckedChange={setNotifyParticipants}
                />
                <Label htmlFor="notifyParticipants">
                  Send notification to participants ({participants.length})
                </Label>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="qrcode" className="flex flex-col items-center justify-center pt-4">
            {qrCodeDataURL ? (
              <div className="bg-white p-4 rounded-md">
                <img 
                  src={qrCodeDataURL} 
                  alt="QR Code for AAR Submission" 
                  className="w-48 h-48"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-48 h-48 bg-gray-100 rounded-md">
                <QrCodeIcon className="h-12 w-12 text-gray-400" />
              </div>
            )}
            <p className="text-sm text-center mt-2">
              Scan this QR code to access the AAR submission page
            </p>
          </TabsContent>
        </Tabs>

        {participants.length === 0 && (
          <Alert className="mt-4 bg-amber-50 border-amber-200">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>No participants added</AlertTitle>
            <AlertDescription>
              This event has no registered participants. Anyone with the link will be able to submit an AAR.
            </AlertDescription>
          </Alert>
        )}

        {requestSent && (
          <Alert className="mt-4 bg-green-50 border-green-200">
            <CheckIcon className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Request Sent</AlertTitle>
            <AlertDescription className="text-green-700">
              AAR feedback request has been sent to all participants.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-4 sm:justify-between">
          <div className="flex items-center">
            <Badge variant="outline" className="mr-2">
              {participants.length} Participants
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleSendRequestToParticipants}
              disabled={loading || requestSent || participants.length === 0 || !notifyParticipants}
            >
              {loading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}