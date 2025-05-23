import { createStyles } from "antd-style"
import { useEffect, useRef, useState } from "react"
import MagicSpin from "@/opensource/components/base/MagicSpin"
import { Flex } from "antd"

interface IsolatedHTMLRendererProps {
	content: string
	sandboxType?: "iframe" | "shadow-dom"
	className?: string
}

const useStyles = createStyles(({ css }) => {
	return {
		rendererContainer: css`
			width: 100%;
			height: 100%;
			overflow: auto;
		`,
		iframe: css`
			width: 100%;
			height: 100%;
			border: none;
			display: block;
		`,
		shadowHost: css`
			width: 100%;
			height: 100%;
			display: block;
			position: relative;
		`,
		loadingContainer: css`
			width: 100%;
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
		`,
	}
})

// 外部资源URL
const TAILWIND_CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.0/tailwind.min.css"
const ECHARTS_JS_URL = "https://cdnjs.cloudflare.com/ajax/libs/echarts/5.6.0/echarts.min.js"

// 解码HTML实体的函数
function decodeHTMLEntities(html: string): string {
	const textarea = document.createElement("textarea")
	textarea.innerHTML = html
	return textarea.value
}

export default function IsolatedHTMLRenderer({
	content,
	sandboxType = "iframe",
	className,
}: IsolatedHTMLRendererProps) {
	const { styles, cx } = useStyles()
	const containerRef = useRef<HTMLDivElement>(null)
	const iframeRef = useRef<HTMLIFrameElement>(null)

	// 处理iframe内容更新
	useEffect(() => {
		if (sandboxType === "iframe" && iframeRef.current && content) {
			const iframe = iframeRef.current
			try {
				// 解码HTML实体
				const decodedContent = decodeHTMLEntities(content)

				// 创建完整HTML内容
				const noTranslateContent = `
						<html translate="no">
						<head>
							<meta name="google" content="notranslate">
							<link rel="stylesheet" href="${TAILWIND_CSS_URL}">
							<script src="${ECHARTS_JS_URL}"></script>
							<style>
								body {
									translate: no !important;
								}
							</style>
							<script>
								// 在HTML内容内直接注入脚本，避免跨域访问
								document.addEventListener('DOMContentLoaded', function() {
									// 给所有链接添加target属性
									document.querySelectorAll('a').forEach(link => {
										const href = link.getAttribute('href');
										// 检查是否为锚点链接（以#开头）
										if (href && href.startsWith('#')) {
											// 为锚点链接添加点击事件处理
											link.addEventListener('click', function(e) {
												e.preventDefault();
												const targetId = href.substring(1);
												const targetElement = document.getElementById(targetId);
												if (targetElement) {
													targetElement.scrollIntoView({ behavior: 'smooth' });
												}
											});
										} else {
											// 非锚点链接在新窗口打开
											link.setAttribute('target', '_blank');
											link.setAttribute('rel', 'noopener noreferrer');
										}
									});

									// 捕获并处理脚本错误
									window.onerror = function(message, source, lineno, colno, error) {
										console.error('HTML渲染错误:', message);
										return true; // 防止错误向上传播
									};
								});
							</script>
						</head>
						<body>
							${decodedContent}
						</body>
						</html>
					`

				// 使用contentWindow.document.write写入内容
				if (iframe.contentWindow) {
					iframe.contentWindow.document.open()
					iframe.contentWindow.document.write(noTranslateContent)
					iframe.contentWindow.document.close()
				} else {
					console.error("无法访问iframe的contentWindow")
				}
			} catch (error) {
				console.error("处理iframe内容时出错:", error)
			}
		}
	}, [content, sandboxType])

	// 如果content为空，显示loading状态
	if (!content || content.trim() === "") {
		return (
			<div className={cx(styles.rendererContainer, styles.loadingContainer, className)}>
				<Flex
					vertical
					align="center"
					justify="center"
					style={{ width: "100%", height: "100%" }}
				>
					<MagicSpin spinning />
				</Flex>
			</div>
		)
	}

	return (
		<div className={cx(styles.rendererContainer, className)}>
			{sandboxType === "iframe" ? (
				<iframe
					ref={iframeRef}
					className={styles.iframe}
					title="Isolated HTML Content"
					sandbox={"allow-scripts allow-modals allow-same-origin"}
					translate="no"
				/>
			) : (
				<div ref={containerRef} className={styles.shadowHost} translate="no" />
			)}
		</div>
	)
}
