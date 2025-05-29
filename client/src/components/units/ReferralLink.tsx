import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, QrCode } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";

interface ReferralLinkProps {
  unitId: number;
}

export default function ReferralLink({ unitId }: ReferralLinkProps) {
  const { toast } = useToast();
  const [showQR, setShowQR] = useState(false);

  // Get unit details
  const { data: unit, isLoading } = useQuery({
    queryKey: [`/api/units/${unitId}`],
    enabled: !!unitId,
  });

  const handleCopyLink = () => {
    if (unit && unit.referralCode) {
      const baseUrl = window.location.origin;
      const referralLink = `${baseUrl}/register/${unit.referralCode}`;
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link copied",
        description: "Referral link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading unit information...</div>;
  }

  if (!unit || !unit.referralCode) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground">
            No referral code available for this unit.
          </p>
        </CardContent>
      </Card>
    );
  }

  const baseUrl = window.location.origin;
  const referralLink = `${baseUrl}/register/${unit.referralCode}`;

  return (
    <>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            Referral Link for {unit.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            Share this link to invite subordinate units to register
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopyLink}
              title="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setShowQR(true)}
              title="Show QR Code"
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Referral QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to register as part of {unit.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {/* We're using a server-side QR code API */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                referralLink
              )}`}
              alt="Registration QR Code"
              className="border rounded"
            />
          </div>
          <div className="text-center text-sm text-muted-foreground mt-2">
            Referral Code:{" "}
            <span className="font-mono">{unit.referralCode}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
