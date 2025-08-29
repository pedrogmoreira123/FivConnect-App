import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { mockAIAgentSettings } from '@/lib/mock-data';
import { AIAgentSettings } from '@/types';

export default function AIAgentPage() {
  const [settings, setSettings] = useState<AIAgentSettings>(mockAIAgentSettings);

  const handleSave = () => {
    console.log('Saving AI Agent configuration:', settings);
    // In a real app, this would call the API to save the configuration
  };

  const updateSettings = (updates: Partial<AIAgentSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-6">A.I. Agent Configuration</h2>

      <div className="max-w-2xl">
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-foreground">A.I. Agent Status</h3>
                <p className="text-sm text-muted-foreground">Enable or disable the automated agent</p>
              </div>
              <Switch
                checked={settings.isEnabled}
                onCheckedChange={(checked) => updateSettings({ isEnabled: checked })}
                data-testid="switch-ai-enabled"
              />
            </div>

            {/* Welcome Message */}
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <Textarea
                id="welcomeMessage"
                className="h-32 resize-none"
                placeholder="Enter the AI welcome message..."
                value={settings.welcomeMessage}
                onChange={(e) => updateSettings({ welcomeMessage: e.target.value })}
                data-testid="textarea-welcome-message"
              />
              <p className="text-xs text-muted-foreground">
                You can use variables like {'{name}'}, {'{protocol}'}, {'{datetime}'} in your message
              </p>
            </div>

            {/* Response Delay */}
            <div className="space-y-2">
              <Label htmlFor="responseDelay">Response Delay (seconds)</Label>
              <Input
                id="responseDelay"
                type="number"
                placeholder="3"
                min="1"
                max="30"
                value={settings.responseDelay}
                onChange={(e) => updateSettings({ responseDelay: parseInt(e.target.value) || 3 })}
                data-testid="input-response-delay"
              />
              <p className="text-xs text-muted-foreground">
                Time to wait before sending automated responses
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} data-testid="button-save-ai-config">
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
