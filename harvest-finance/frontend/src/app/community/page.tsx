'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, Plus, Search, Filter } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Container, Section, Button, Badge } from '@/components/ui';
import { PostCard, Post } from '@/components/community/PostCard';
import { CreatePostForm } from '@/components/community/CreatePostForm';
import { GroupCard, Group } from '@/components/community/GroupCard';
import { Leaderboard } from '@/components/community/Leaderboard';
import apiClient from '@/lib/api-client';

type Tab = 'feed' | 'groups' | 'leaderboard';

const MOCK_POSTS: Post[] = [
  {
    id: '1',
    title: 'Best irrigation schedule for dry season maize',
    content: 'I\'ve been experimenting with drip irrigation this dry season and found that watering every other day in the early morning cut my water usage by 40% while keeping yields strong. Happy to share my full schedule!',
    type: 'TIP',
    likeCount: 24,
    commentCount: 8,
    liked: false,
    tags: ['irrigation', 'maize', 'dry-season'],
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u1', firstName: 'Amara', lastName: 'Diallo' },
  },
  {
    id: '2',
    title: 'Where to find affordable organic fertiliser in Kano?',
    content: 'Looking for local suppliers of organic fertiliser in Kano state. The prices at the usual agro-input shops have tripled. Anyone have contacts for bulk purchase cooperatives?',
    type: 'QUESTION',
    likeCount: 11,
    commentCount: 15,
    liked: false,
    tags: ['fertiliser', 'kano', 'organic'],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u2', firstName: 'Ibrahim', lastName: 'Musa' },
  },
  {
    id: '3',
    title: 'Season update: cassava harvest exceeded target by 20%',
    content: 'Just wrapped up my cassava harvest and I am over the moon — 20% above target this season! Key changes: I switched to an improved TMS 30572 variety and adopted ridge planting. If anyone wants details on the process, drop a comment.',
    type: 'GENERAL',
    likeCount: 47,
    commentCount: 19,
    liked: true,
    tags: ['cassava', 'harvest', 'success'],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u3', firstName: 'Ngozi', lastName: 'Okafor' },
  },
];

const MOCK_GROUPS: Group[] = [
  { id: 'g1', name: 'Maize Growers Network', description: 'Exchange tips and market info for maize farmers across West Africa.', category: 'CROP_TYPE', memberCount: 1240, isPrivate: false, tags: ['maize', 'grains'], isMember: true },
  { id: 'g2', name: 'Kano State Farmers', description: 'Local network for farmers in Kano and surrounding areas.', category: 'REGION', memberCount: 578, isPrivate: false, tags: ['kano'], isMember: false },
  { id: 'g3', name: 'Organic Farming Circle', description: 'Sustainable and organic farming practices discussion group.', category: 'INTEREST', memberCount: 893, isPrivate: false, tags: ['organic', 'sustainable'], isMember: false },
  { id: 'g4', name: 'Women in Agriculture', description: 'Empowering women farmers — knowledge, resources, and advocacy.', category: 'INTEREST', memberCount: 2100, isPrivate: false, tags: ['women', 'empowerment'], isMember: false },
];

const MOCK_LEADERBOARD = [
  { userId: 'Amara Diallo', postCount: 32, commentCount: 87, score: 183 },
  { userId: 'Ibrahim Musa', postCount: 28, commentCount: 64, score: 148 },
  { userId: 'Ngozi Okafor', postCount: 19, commentCount: 102, score: 159 },
  { userId: 'Fatou Sow', postCount: 15, commentCount: 45, score: 90 },
  { userId: 'Kofi Mensah', postCount: 12, commentCount: 31, score: 67 },
];

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleLike = useCallback((id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
          : p,
      ),
    );
    // apiClient.post(`/api/v1/community/posts/${id}/react`).catch(() => null);
  }, []);

  const handleCommentClick = useCallback((id: string) => {
    // future: open comment drawer
  }, []);

  const handleCreatePost = async (data: { title: string; content: string; type: string; tags: string[] }) => {
    const newPost: Post = {
      id: String(Date.now()),
      title: data.title,
      content: data.content,
      type: data.type as Post['type'],
      likeCount: 0,
      commentCount: 0,
      liked: false,
      tags: data.tags,
      createdAt: new Date().toISOString(),
      author: { id: 'me', firstName: 'You', lastName: '' },
    };
    setPosts((prev) => [newPost, ...prev]);
    setShowCreateForm(false);
    // await apiClient.post('/api/v1/community/posts', data);
  };

  const handleJoinGroup = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => g.id === id ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g),
    );
    // apiClient.post(`/api/v1/community/groups/${id}/join`).catch(() => null);
  };

  const handleLeaveGroup = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => g.id === id ? { ...g, isMember: false, memberCount: g.memberCount - 1 } : g),
    );
    // apiClient.delete(`/api/v1/community/groups/${id}/leave`).catch(() => null);
  };

  const filteredPosts = posts.filter((p) => {
    const matchesType = filterType === 'ALL' || p.type === filterType;
    const matchesSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.content.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d1f14] flex flex-col">
      <Header />

      <Section className="flex-1 py-8">
        <Container>
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-50">Community Hub</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">Connect, share, and learn with fellow farmers</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowCreateForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" />
              New Post
            </Button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Members', value: '4,821', icon: Users },
              { label: 'Posts today', value: '142', icon: TrendingUp },
              { label: 'Active groups', value: '38', icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white dark:bg-[#1a3020] rounded-xl p-3 flex items-center gap-3 border border-gray-100 dark:border-[rgba(141,187,85,0.12)]">
                <Icon className="w-5 h-5 text-harvest-green-600 dark:text-harvest-green-400" />
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-zinc-50">{value}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-800/50 rounded-xl mb-6 w-fit">
            {(['feed', 'groups', 'leaderboard'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                  tab === t
                    ? 'bg-white dark:bg-zinc-800 text-harvest-green-700 dark:text-harvest-green-300 shadow-sm'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Feed tab */}
          {tab === 'feed' && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {showCreateForm && (
                  <CreatePostForm onSubmit={handleCreatePost} />
                )}

                {/* Search + filter */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search posts..."
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
                  >
                    {['ALL', 'GENERAL', 'QUESTION', 'TIP', 'TRADE'].map((t) => (
                      <option key={t} value={t}>{t === 'ALL' ? 'All types' : t}</option>
                    ))}
                  </select>
                </div>

                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    onCommentClick={handleCommentClick}
                  />
                ))}

                {filteredPosts.length === 0 && (
                  <div className="text-center py-12 text-gray-400 dark:text-zinc-500">
                    <p className="text-sm">No posts match your filter.</p>
                  </div>
                )}
              </div>

              <aside className="space-y-4">
                <Leaderboard entries={MOCK_LEADERBOARD} />

                <div className="bg-white dark:bg-[#1a3020] rounded-xl border border-gray-100 dark:border-[rgba(141,187,85,0.12)] p-4">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-3">Your Groups</h4>
                  <div className="space-y-2">
                    {groups.filter((g) => g.isMember).map((g) => (
                      <div key={g.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-harvest-green-100 dark:bg-harvest-green-900/30" />
                        <span className="text-xs text-gray-700 dark:text-zinc-300 truncate">{g.name}</span>
                      </div>
                    ))}
                    {groups.filter((g) => g.isMember).length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500">You haven&apos;t joined any groups yet.</p>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* Groups tab */}
          {tab === 'groups' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onJoin={handleJoinGroup}
                  onLeave={handleLeaveGroup}
                  onClick={() => {}}
                />
              ))}
            </div>
          )}

          {/* Leaderboard tab */}
          {tab === 'leaderboard' && (
            <div className="max-w-lg">
              <Leaderboard entries={MOCK_LEADERBOARD} />
            </div>
          )}
        </Container>
      </Section>

      <Footer />
    </div>
  );
}
