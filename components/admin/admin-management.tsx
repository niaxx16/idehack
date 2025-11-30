'use client'

import { useState, useEffect } from 'react'
import { Profile } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Plus, Shield, Clock, Copy, AlertCircle, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AdminManagementProps {
  currentUser: Profile | null
  onUpdate: () => void
}

const EXPIRATION_OPTIONS = [
  { label: '1 Day', value: 1 },
  { label: '3 Days', value: 3 },
  { label: '1 Week', value: 7 },
  { label: '1 Month', value: 30 },
  { label: 'Permanent', value: 0 },
]

export function AdminManagement({ currentUser, onUpdate }: AdminManagementProps) {
  const [admins, setAdmins] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
  const supabase = createClient()

  // Form fields
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [expirationDays, setExpirationDays] = useState('7')
  const [error, setError] = useState<string | null>(null)

  // Credentials to show after creation
  const [createdEmail, setCreatedEmail] = useState('')
  const [createdPassword, setCreatedPassword] = useState('')

  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAdmins(data || [])
    } catch (err: any) {
      console.error('Failed to load admins:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminName || !adminEmail) return

    setIsCreating(true)
    setError(null)

    try {
      // Generate random password
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: randomPassword,
        options: {
          data: {
            full_name: adminName,
            role: 'admin',
          },
        },
      })

      if (authError) throw authError

      // Calculate expiration date
      const days = parseInt(expirationDays)
      let expirationDate = null
      if (days > 0) {
        expirationDate = new Date()
        expirationDate.setDate(expirationDate.getDate() + days)
      }

      // Create profile manually
      if (authData.user) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            role: 'admin',
            full_name: adminName,
            email: adminEmail,
            display_name: adminName,
            wallet_balance: 1000,
            is_super_admin: false,
            expiration_date: expirationDate?.toISOString() || null,
          })

        if (insertError) {
          console.error('Profile insert error:', insertError)
          throw insertError
        }
      }

      // Show credentials
      setCreatedEmail(adminEmail)
      setCreatedPassword(randomPassword)
      setShowCredentialsDialog(true)

      setAdminName('')
      setAdminEmail('')
      setExpirationDays('7')
      setShowCreateDialog(false)
      loadAdmins()
    } catch (err: any) {
      console.error('Failed to create admin:', err)
      setError(err.message || 'Failed to create admin')
    } finally {
      setIsCreating(false)
    }
  }

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false
    return new Date(expirationDate) < new Date()
  }

  const formatExpirationDate = (expirationDate: string | null) => {
    if (!expirationDate) return 'Permanent'
    const date = new Date(expirationDate)
    const now = new Date()
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) return 'Expired'
    if (daysLeft === 0) return 'Expires today'
    if (daysLeft === 1) return 'Expires tomorrow'
    return `${daysLeft} days left`
  }

  const getExpirationColor = (expirationDate: string | null) => {
    if (!expirationDate) return 'bg-green-100 text-green-800 border-green-300'
    const date = new Date(expirationDate)
    const now = new Date()
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) return 'bg-red-100 text-red-800 border-red-300'
    if (daysLeft <= 3) return 'bg-orange-100 text-orange-800 border-orange-300'
    return 'bg-blue-100 text-blue-800 border-blue-300'
  }

  // Check if current user is super admin
  const isSuperAdmin = currentUser?.is_super_admin === true

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Management
          </CardTitle>
          <CardDescription>
            Only super admins can manage other administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <p className="text-muted-foreground">
              You don't have permission to access this section.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Contact the system owner for admin management.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Management
              </CardTitle>
              <CardDescription>
                Create and manage administrator accounts with access control
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Admin</DialogTitle>
                  <DialogDescription>
                    Add a new administrator with time-limited access
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Full Name</Label>
                    <Input
                      id="adminName"
                      placeholder="e.g., John Doe"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="e.g., admin@example.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiration">Access Duration</Label>
                    <Select value={expirationDays} onValueChange={setExpirationDays}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPIRATION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Admin access will expire after this period
                    </p>
                  </div>
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <Button type="submit" disabled={isCreating} className="w-full">
                    {isCreating ? 'Creating...' : 'Create Admin'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Credentials Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Created Successfully</DialogTitle>
            <DialogDescription>
              Save these credentials and share them with the admin. They cannot be recovered later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex gap-2">
                <Input value={createdEmail} readOnly className="font-mono" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(createdEmail)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password (Save this!)</Label>
              <div className="flex gap-2">
                <Input value={createdPassword} readOnly className="font-mono" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(createdPassword)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Make sure to save this password! It won't be shown again.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admins List */}
      <Card>
        <CardHeader>
          <CardTitle>All Administrators ({admins.length})</CardTitle>
          <CardDescription>
            System administrators and their access status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No admins yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <Card
                  key={admin.id}
                  className={`${
                    isExpired(admin.expiration_date)
                      ? 'bg-red-50 border-red-200'
                      : admin.is_super_admin
                      ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
                      : 'bg-background'
                  }`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          {admin.is_super_admin ? (
                            <Crown className="h-5 w-5 text-purple-600" />
                          ) : (
                            <Shield className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">
                              {admin.full_name || admin.display_name || 'Anonymous Admin'}
                            </h3>
                            {admin.is_super_admin && (
                              <Badge variant="default" className="bg-purple-600">
                                Super Admin
                              </Badge>
                            )}
                            {isExpired(admin.expiration_date) && (
                              <Badge variant="destructive">
                                Expired
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getExpirationColor(admin.expiration_date)}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {formatExpirationDate(admin.expiration_date)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
