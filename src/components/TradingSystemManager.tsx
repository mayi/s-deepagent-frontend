'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit3, Trash2, Star, Eye, X, Save,
  BookOpen, Loader2, AlertCircle, ChevronDown, ChevronUp, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TradingSystem {
  id: number;
  user_id: number | null;
  name: string;
  description: string;
  content?: string;
  content_length?: number;
  is_preset: number;
  is_default: number;
  is_user_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function TradingSystemManager() {
  const { token } = useAuth();

  // List state
  const [systems, setSystems] = useState<TradingSystem[]>([]);
  const [defaultId, setDefaultId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [showEditor, setShowEditor] = useState(false);
  const [editingSystem, setEditingSystem] = useState<TradingSystem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // View modal state
  const [viewingSystem, setViewingSystem] = useState<TradingSystem | null>(null);
  const [viewContent, setViewContent] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Expanded cards
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadSystems = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/trading-systems', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSystems(data.systems);
        setDefaultId(data.default_id);
      }
    } catch (err) {
      console.error('加载交易系统失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSystems();
  }, [loadSystems]);

  const handleCreate = () => {
    setEditingSystem(null);
    setFormName('');
    setFormDescription('');
    setFormContent('');
    setEditorError('');
    setShowPreview(false);
    setShowEditor(true);
  };

  const handleEdit = async (system: TradingSystem) => {
    // Fetch full content
    try {
      const res = await fetch(`/api/trading-systems/${system.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setEditingSystem(data.system);
        setFormName(data.system.name);
        setFormDescription(data.system.description || '');
        setFormContent(data.system.content || '');
        setEditorError('');
        setShowPreview(false);
        setShowEditor(true);
      }
    } catch (err) {
      console.error('加载交易系统详情失败:', err);
    }
  };

  const handleView = async (system: TradingSystem) => {
    setIsLoadingContent(true);
    setViewingSystem(system);
    try {
      const res = await fetch(`/api/trading-systems/${system.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setViewContent(data.system.content || '');
      }
    } catch (err) {
      console.error('加载内容失败:', err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setEditorError('请输入交易系统名称');
      return;
    }
    if (!formContent.trim()) {
      setEditorError('请输入交易系统规则内容');
      return;
    }

    setIsSaving(true);
    setEditorError('');

    try {
      const url = editingSystem
        ? `/api/trading-systems/${editingSystem.id}`
        : '/api/trading-systems';
      const method = editingSystem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim(),
          content: formContent.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success !== false) {
        setShowEditor(false);
        loadSystems();
      } else {
        setEditorError(data.detail || data.message || '保存失败');
      }
    } catch (err) {
      setEditorError('网络错误，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (system: TradingSystem) => {
    if (!confirm(`确定要删除交易系统「${system.name}」吗？此操作不可撤销。`)) return;

    try {
      const res = await fetch(`/api/trading-systems/${system.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        loadSystems();
      } else {
        alert(data.detail || data.message || '删除失败');
      }
    } catch (err) {
      alert('网络错误');
    }
  };

  const handleSetDefault = async (systemId: number) => {
    try {
      const isCurrentDefault = defaultId === systemId;
      if (isCurrentDefault) {
        // Clear default - use the parent route method
        // We'd need a different endpoint for this, or send system_id=0
        // For simplicity, we just toggle - set it again won't hurt
        return;
      }

      const res = await fetch(`/api/trading-systems/${systemId}/default`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDefaultId(systemId);
        loadSystems();
      }
    } catch (err) {
      console.error('设置默认失败:', err);
    }
  };

  // Separate preset and custom systems
  const presetSystems = systems.filter(s => s.is_preset);
  const customSystems = systems.filter(s => !s.is_preset);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none p-5 border-b border-ink-600/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}
          >
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink-100">交易系统管理</h2>
            <p className="text-xs text-ink-400">创建和管理您的交易规则体系，分析时可选择应用</p>
          </div>
        </div>
        <motion.button
          onClick={handleCreate}
          className="btn-primary flex items-center gap-2 text-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          新建交易系统
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : (
          <>
            {/* Preset Systems */}
            {presetSystems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-ink-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400/70" />
                  系统预置
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {presetSystems.map(system => (
                    <SystemCard
                      key={system.id}
                      system={system}
                      isDefault={defaultId === system.id}
                      isExpanded={expandedId === system.id}
                      onToggleExpand={() => setExpandedId(expandedId === system.id ? null : system.id)}
                      onView={() => handleView(system)}
                      onSetDefault={() => handleSetDefault(system.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom Systems */}
            <div>
              <h3 className="text-sm font-semibold text-ink-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400/70" />
                我的交易系统
                <span className="text-xs font-normal text-ink-500">({customSystems.length}/10)</span>
              </h3>
              {customSystems.length === 0 ? (
                <motion.div
                  className="text-center py-16 rounded-xl border border-dashed border-ink-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-ink-500/50" />
                  <p className="text-ink-400 mb-2">还没有自定义交易系统</p>
                  <p className="text-sm text-ink-500 mb-6">创建您自己的交易规则体系，在分析股票时获得个性化操作指导</p>
                  <motion.button
                    onClick={handleCreate}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      color: '#fbbf24',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    创建第一套交易系统
                  </motion.button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customSystems.map(system => (
                    <SystemCard
                      key={system.id}
                      system={system}
                      isDefault={defaultId === system.id}
                      isExpanded={expandedId === system.id}
                      onToggleExpand={() => setExpandedId(expandedId === system.id ? null : system.id)}
                      onView={() => handleView(system)}
                      onEdit={() => handleEdit(system)}
                      onDelete={() => handleDelete(system)}
                      onSetDefault={() => handleSetDefault(system.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSaving && setShowEditor(false)}
            />

            {/* Modal */}
            <motion.div
              className="relative w-full max-w-4xl max-h-[90vh] bg-ink-800 rounded-2xl border border-ink-600 shadow-float flex flex-col overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-ink-600">
                <h3 className="text-lg font-bold text-ink-100">
                  {editingSystem ? '编辑交易系统' : '创建交易系统'}
                </h3>
                <button
                  onClick={() => !isSaving && setShowEditor(false)}
                  className="p-2 text-ink-400 hover:text-ink-100 rounded-lg hover:bg-ink-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">
                    交易系统名称 <span className="text-coral-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="例如：均线趋势跟踪系统"
                    className="input w-full py-3"
                    maxLength={50}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">
                    简要描述
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="一句话描述核心理念和适用场景"
                    className="input w-full py-3"
                    maxLength={200}
                  />
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-ink-300">
                      交易规则 <span className="text-coral-400">*</span>
                      <span className="text-xs text-ink-500 ml-2">支持 Markdown 格式</span>
                    </label>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {showPreview ? '编辑' : '预览'}
                    </button>
                  </div>
                  {showPreview ? (
                    <div className="min-h-[300px] max-h-[400px] overflow-y-auto p-4 bg-ink-900 rounded-xl border border-ink-600 prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {formContent || '*（暂无内容）*'}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <textarea
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder={`请输入您的交易系统规则，例如：\n\n## 一、核心理念\n- 纪律至上，无条件执行\n- 只做向上趋势的股票\n\n## 二、入场规则\n- 20日、40日、60日均线向上发散\n- 20日均线上穿40日和60日均线时买入\n\n## 三、止损纪律\n- 止损控制在 2-3%\n- 跌破20日均线无条件清仓\n\n## 四、止盈规则\n- 涨幅超5%时上调止损至买入价\n- 跌破5日均线止盈一半，跌破10日均线清仓`}
                      className="input w-full py-3 min-h-[300px] max-h-[400px] resize-y font-mono text-sm"
                    />
                  )}
                </div>

                {/* Error */}
                {editorError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm text-coral-400 bg-coral-400/10 px-4 py-3 rounded-xl"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {editorError}
                  </motion.div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-ink-600 bg-ink-800/50">
                <button
                  onClick={() => !isSaving && setShowEditor(false)}
                  disabled={isSaving}
                  className="px-5 py-2.5 text-sm font-medium text-ink-300 hover:text-ink-100 rounded-xl hover:bg-ink-700 transition-colors"
                >
                  取消
                </button>
                <motion.button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2 text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingSystem ? '保存修改' : '创建'}
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Content Modal */}
      <AnimatePresence>
        {viewingSystem && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setViewingSystem(null)}
            />
            <motion.div
              className="relative w-full max-w-3xl max-h-[85vh] bg-ink-800 rounded-2xl border border-ink-600 shadow-float flex flex-col overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="flex items-center justify-between p-5 border-b border-ink-600">
                <div>
                  <h3 className="text-lg font-bold text-ink-100 flex items-center gap-2">
                    {viewingSystem.name}
                    {viewingSystem.is_preset ? (
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300">预置</span>
                    ) : null}
                  </h3>
                  {viewingSystem.description && (
                    <p className="text-sm text-ink-400 mt-1">{viewingSystem.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setViewingSystem(null)}
                  className="p-2 text-ink-400 hover:text-ink-100 rounded-lg hover:bg-ink-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 prose prose-invert prose-sm max-w-none">
                {isLoadingContent ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  </div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {viewContent || '*（暂无内容）*'}
                  </ReactMarkdown>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SystemCard Sub-component ---

interface SystemCardProps {
  system: TradingSystem;
  isDefault: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault: () => void;
}

function SystemCard({
  system, isDefault, isExpanded, onToggleExpand,
  onView, onEdit, onDelete, onSetDefault
}: SystemCardProps) {
  return (
    <motion.div
      layout
      className={`rounded-xl border transition-all ${
        isDefault
          ? 'border-amber-500/40 bg-amber-400/5'
          : 'border-ink-600 bg-ink-800/50 hover:border-ink-500'
      }`}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h4 className="font-semibold text-ink-100 truncate">{system.name}</h4>
            {system.is_preset ? (
              <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/20">
                预置
              </span>
            ) : null}
            {isDefault && (
              <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-jade-400/15 text-jade-400 border border-jade-400/20">
                默认
              </span>
            )}
          </div>
          <button
            onClick={onToggleExpand}
            className="p-1 text-ink-400 hover:text-ink-200 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {system.description && (
          <p className="text-sm text-ink-400 line-clamp-2 mb-3">{system.description}</p>
        )}

        {/* Quick info */}
        <div className="flex items-center gap-3 text-xs text-ink-500">
          <span>{system.content_length ? `${Math.round(system.content_length / 1024 * 10) / 10} KB` : ''}</span>
          <span>•</span>
          <span>{new Date(system.updated_at || system.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Expanded Actions */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 flex items-center gap-2 border-t border-ink-600/50">
              <motion.button
                onClick={onView}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-ink-300 hover:text-amber-400 rounded-lg hover:bg-ink-700/50 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Eye className="w-3.5 h-3.5" />
                查看规则
              </motion.button>

              <motion.button
                onClick={onSetDefault}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  isDefault
                    ? 'text-jade-400 bg-jade-400/10'
                    : 'text-ink-300 hover:text-amber-400 hover:bg-ink-700/50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Star className={`w-3.5 h-3.5 ${isDefault ? 'fill-jade-400' : ''}`} />
                {isDefault ? '已设为默认' : '设为默认'}
              </motion.button>

              {onEdit && (
                <motion.button
                  onClick={onEdit}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-ink-300 hover:text-amber-400 rounded-lg hover:bg-ink-700/50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  编辑
                </motion.button>
              )}

              {onDelete && (
                <motion.button
                  onClick={onDelete}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-ink-300 hover:text-coral-400 rounded-lg hover:bg-coral-400/10 transition-colors ml-auto"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  删除
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
