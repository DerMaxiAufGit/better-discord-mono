import { useNavigate } from 'react-router';
import { ArrowLeft, Check, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_VERSION, APP_NAME, ROADMAP, CHANGELOG } from '@/config/version';
import { cn } from '@/lib/utils';

export function InfoPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">About</h1>
      </div>

      <div className="space-y-8">
        {/* Version Info */}
        <section className="text-center py-6 border rounded-lg bg-muted/30">
          <h2 className="text-3xl font-bold">{APP_NAME}</h2>
          <p className="text-muted-foreground mt-1">Version {APP_VERSION}</p>
          <p className="text-sm text-muted-foreground mt-4">
            Secure, self-hosted communication platform
          </p>
        </section>

        {/* Roadmap */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Roadmap</h2>
          <div className="space-y-4">
            {ROADMAP.map((phase) => (
              <div
                key={phase.version}
                className={cn(
                  'border rounded-lg p-4',
                  phase.status === 'completed' && 'border-green-500/50 bg-green-500/5',
                  phase.status === 'current' && 'border-blue-500/50 bg-blue-500/5',
                  phase.status === 'planned' && 'border-muted'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                      v{phase.version}
                    </span>
                    <span className="font-semibold">{phase.title}</span>
                  </div>
                  {phase.status === 'completed' && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <Check className="h-3 w-3" />
                      Completed
                    </span>
                  )}
                  {phase.status === 'current' && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <Clock className="h-3 w-3" />
                      In Progress
                    </span>
                  )}
                  {phase.status === 'planned' && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Planned
                    </span>
                  )}
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  {phase.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground/50">-</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Changelog */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Changelog</h2>
          <div className="space-y-4">
            {CHANGELOG.map((release) => (
              <div key={release.version} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                    v{release.version}
                  </span>
                  <span className="text-xs text-muted-foreground">{release.date}</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground/50">-</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Credits */}
        <section className="text-center py-4 text-sm text-muted-foreground">
          <p>Built with privacy in mind</p>
          <p className="mt-1">Your server, your data, your rules</p>
        </section>
      </div>
    </div>
  );
}
